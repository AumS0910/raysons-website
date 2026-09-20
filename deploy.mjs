/**
 * Full-site deploy to raysonsgroup.com.
 *
 * WHY THIS EXISTS
 * The site was being deployed by hand, one file at a time — whatever had just been
 * edited. That is how raysonsgroup.com ended up serving four HTML pages and nothing
 * else: no stylesheet, no script, no enquire.html, and 49 missing images and films.
 * Every individual upload "succeeded", so nothing ever looked wrong. The quote form
 * was a 404 for weeks and the only symptom was enquiries that never arrived.
 *
 * So this uploads EVERYTHING, every time, and then asks the live server to prove it.
 * Two properties matter more than speed:
 *
 *   1. A failed upload is retried, then reported. curl can return success on a
 *      transfer that did not land — one file did exactly that during the recovery,
 *      and it was only caught because the page still 404'd afterwards.
 *   2. Nothing is trusted until it is fetched back over HTTPS. "Uploaded" is not the
 *      same as "being served". Code and video must match byte for byte; images are
 *      checked by DIMENSION instead, because Hostinger's CDN re-encodes them and a
 *      byte comparison there cries wolf on a deploy that is perfectly fine.
 *
 * CREDENTIALS are never stored here. Put them in .deploy-credentials (gitignored):
 *
 *     FTP_HOST=<host from hPanel -> Files -> FTP Accounts>
 *     FTP_USER=<that account's username>
 *     FTP_PASS=<its password>
 *     FTP_DIR=/                       # the web root; check in hPanel File Manager
 *     SITE_URL=https://raysonsgroup.com
 *
 * USAGE
 *     node stamp-assets.mjs && node deploy.mjs          # the whole site
 *     node deploy.mjs --only=html,css,js                # just code, skip 21MB of film
 *     node deploy.mjs --dry-run                         # list what would go
 *
 * The FTP root is SHARED with the older PHP site (about-us.php, blogs.php,
 * agnis_webkit/ and friends). This only ever writes paths that exist in
 * raysons-scrollyteller/, and never deletes anything, so their site is untouched.
 */
import fs from 'node:fs';
import path from 'node:path';
import { execFile } from 'node:child_process';
import { promisify } from 'node:util';
import sharp from 'sharp';

const execFileAsync = promisify(execFile);
const ROOT = path.resolve('raysons-scrollyteller');

// ── credentials ────────────────────────────────────────────────────────────────
function loadCreds() {
  const out = { ...process.env };
  const f = path.resolve('.deploy-credentials');
  if (fs.existsSync(f)) {
    for (const line of fs.readFileSync(f, 'utf8').split(/\r?\n/)) {
      const m = line.match(/^\s*([A-Z_]+)\s*=\s*(.*?)\s*$/);
      if (m && !line.trim().startsWith('#')) out[m[1]] = m[2];
    }
  }
  const need = ['FTP_HOST', 'FTP_USER', 'FTP_PASS'];
  const missing = need.filter((k) => !out[k]);
  if (missing.length) {
    console.error(`\nMissing ${missing.join(', ')}.`);
    console.error('Create .deploy-credentials (it is gitignored) — see the header of this file.\n');
    process.exit(1);
  }
  out.FTP_DIR = (out.FTP_DIR || '/').replace(/\/*$/, '/');
  out.SITE_URL = (out.SITE_URL || 'https://raysonsgroup.com').replace(/\/$/, '');
  return out;
}

// ── what ships ─────────────────────────────────────────────────────────────────
// Deny-list, not an allow-list: a new folder of images should ship by default. The
// alternative is how the site got into this state — assets nobody remembered to add.
const SKIP_DIRS = new Set(['node_modules', '.git', '.github']);
const SKIP_FILES = /(^\.DS_Store$|^Thumbs\.db$|\.(docx|mov|psd|ai|zip)$|^WhatsApp)/i;

function collect(dir, base = '') {
  const out = [];
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const rel = base ? `${base}/${e.name}` : e.name;
    if (e.isDirectory()) {
      if (SKIP_DIRS.has(e.name)) continue;
      out.push(...collect(path.join(dir, e.name), rel));
    } else if (!SKIP_FILES.test(e.name)) {
      out.push({ rel, abs: path.join(dir, e.name), size: fs.statSync(path.join(dir, e.name)).size });
    }
  }
  return out;
}

const ftpUrl = (c, rel) => `ftp://${c.FTP_HOST}${c.FTP_DIR}${rel.split('/').map(encodeURIComponent).join('/')}`;
const httpUrl = (c, rel) => `${c.SITE_URL}/${rel.split('/').map(encodeURIComponent).join('/')}`;

async function upload(c, f) {
  // --ftp-create-dirs so images/products/hydraulic/ appears on its own
  await execFileAsync('curl', [
    '-sS', '--fail', '--ftp-create-dirs', '--max-time', '900',
    '-u', `${c.FTP_USER}:${c.FTP_PASS}`, '-T', f.abs, ftpUrl(c, f.rel),
  ], { maxBuffer: 1 << 24 });
}

const RASTER = /\.(png|jpe?g|webp|gif|avif)$/i;

/**
 * Verify one file is genuinely being served.
 *
 * Byte-exactness is the right test for code and video, but NOT for images: Hostinger
 * puts a CDN in front (x-hcdn-*) that re-encodes them, so the served PNG is a different
 * size from ours — sometimes smaller, sometimes LARGER — while being perfectly correct.
 * Comparing byte counts there produced 17 false alarms on a deploy that was fine.
 * For images the honest check is that it still decodes to the same picture, so this
 * compares DIMENSIONS; a truncated or half-written upload fails to decode at all.
 *
 * Dotfiles are skipped: Apache refuses to serve .htaccess over HTTP by design, and a
 * 403 there is the correct answer, not a problem.
 */
async function verify(c, f) {
  if (path.basename(f.rel).startsWith('.')) return { ok: true, note: 'not web-served (by design)' };
  const tmp = path.join(process.env.TEMP || '/tmp', `_v${process.pid}_${Math.random().toString(36).slice(2)}`);
  try {
    const { stdout } = await execFileAsync('curl', [
      '-sS', '-o', tmp, '-w', '%{http_code} %{size_download} %{content_type}',
      '--max-time', '180', httpUrl(c, f.rel),
    ], { maxBuffer: 1 << 20 });
    const [codeS, sizeS, ctype = ''] = stdout.trim().split(/\s+/);
    const code = Number(codeS), size = Number(sizeS);
    if (code !== 200) return { ok: false, why: `HTTP ${code}` };

    if (RASTER.test(f.rel)) {
      if (!ctype.startsWith('image/')) return { ok: false, why: `served as ${ctype}, not an image` };
      // Read into a Buffer first: on Windows sharp keeps the file handle open and the
      // cleanup unlink below then fails with EBUSY, killing the whole verify pass.
      const [live, local] = await Promise.all([
        sharp(fs.readFileSync(tmp)).metadata(),
        sharp(fs.readFileSync(f.abs)).metadata(),
      ]);
      if (live.width !== local.width || live.height !== local.height) {
        return { ok: false, why: `${live.width}x${live.height} live vs ${local.width}x${local.height} local` };
      }
      return { ok: true, note: size === f.size ? '' : 'CDN re-encoded' };
    }
    if (size !== f.size) return { ok: false, why: `${size}b served, ${f.size}b local` };
    return { ok: true };
  } catch (e) {
    return { ok: false, why: String(e).replace(/\s+/g, ' ').slice(0, 100) };
  } finally {
    // never let cleanup fail the verification it was only tidying up after
    try { fs.rmSync(tmp, { force: true }); } catch { /* the OS will reap it */ }
  }
}

// ── run ────────────────────────────────────────────────────────────────────────
const args = process.argv.slice(2);
const dryRun = args.includes('--dry-run');
const onlyArg = args.find((a) => a.startsWith('--only='));
const only = onlyArg ? onlyArg.slice(7).split(',').map((s) => s.trim().toLowerCase()) : null;

const creds = loadCreds();
let files = collect(ROOT);
if (only) files = files.filter((f) => only.includes(path.extname(f.rel).slice(1).toLowerCase()));
files.sort((a, b) => a.size - b.size);           // quick wins first, the 8MB film last

const totalMB = (files.reduce((n, f) => n + f.size, 0) / 1048576).toFixed(1);
console.log(`\n${files.length} files, ${totalMB} MB -> ${creds.FTP_HOST}${creds.FTP_DIR}`);
if (dryRun) { files.forEach((f) => console.log(`  ${f.rel}`)); process.exit(0); }

const failed = [];
let done = 0;
for (const f of files) {
  let ok = false;
  for (let attempt = 1; attempt <= 3 && !ok; attempt++) {
    try { await upload(creds, f); ok = true; }
    catch (e) {
      if (attempt === 3) { failed.push({ ...f, why: String(e).split('\n')[0].slice(0, 120) }); }
      else await new Promise((r) => setTimeout(r, 1500 * attempt));
    }
  }
  done++;
  if (done % 10 === 0 || done === files.length) process.stdout.write(`  uploaded ${done}/${files.length}\r`);
}
console.log(`\n  uploaded ${files.length - failed.length}/${files.length}`);
failed.forEach((f) => console.log(`  FAILED  ${f.rel} — ${f.why}`));

// VERIFY. The whole point: an upload that reported success but did not land is the
// failure mode that broke this site, and only the live server can rule it out.
console.log('\nverifying against the live server...');
const wrong = [];
let checked = 0;
const queue = [...files];
await Promise.all(Array.from({ length: 6 }, async () => {
  while (queue.length) {
    const f = queue.shift();
    const r = await verify(creds, f);
    if (!r.ok) wrong.push({ rel: f.rel, why: r.why });
    checked++;
    if (checked % 10 === 0) process.stdout.write(`  checked ${checked}/${files.length}\r`);
  }
}));
console.log(`  checked ${checked}/${files.length}          `);

if (wrong.length) {
  console.log(`\n${wrong.length} file(s) are NOT being served correctly:`);
  wrong.slice(0, 30).forEach((w) => console.log(`  ${w.rel} — ${w.why}`));
  process.exitCode = 1;
} else {
  console.log(`\nAll ${files.length} files verified live at ${creds.SITE_URL}`);
}
