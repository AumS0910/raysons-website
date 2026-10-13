/**
 * Build stamp + self-heal endpoint.
 *
 * WHY THIS EXISTS
 * iOS Safari restores a suspended tab from a snapshot without re-fetching it. A phone
 * can therefore sit on a build from days ago no matter what the server sends and no
 * matter what Cache-Control says — which is exactly what happened: a client's phone
 * showed a footer with no Follow column beside a portrait cropped at the thighs, a
 * combination that only existed on the server for a single deploy. Three rounds were
 * spent proving the server was correct, which it was, and which helped nobody.
 *
 * So each page now carries <meta name="build"> and asks version.json (served no-store)
 * whether it is still current. If not, it reloads itself once. The client never has to
 * clear anything again, and "did it actually deploy" stops being a question.
 *
 * RUN ORDER MATTERS — the hash must be taken over the FINAL bytes of every page:
 *
 *     node make-version.mjs && node stamp-assets.mjs && node deploy.mjs
 *
 * make-version writes the meta tag, stamp-assets rewrites the ?v= asset URLs, and that
 * second pass changes the pages again — so make-version runs twice internally, hashing
 * after its own first write, to reach a stable value. (Simpler than teaching the two
 * scripts about each other, and it costs milliseconds.)
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = path.resolve('raysons-scrollyteller');
const PAGES = ['index.html', 'About Us.html', 'foundry.html', 'products.html', 'enquire.html'];
// The shared code too: a CSS-only fix is still a new build the visitor needs.
const EXTRA = ['styles.css', 'about-cinema.css', 'foundry.css', 'about.js', 'foundry.js',
               'products.js', 'spa.js', 'cinema.js', 'theme.js'];

function stampOnce() {
  const h = crypto.createHash('sha1');
  for (const f of [...PAGES, ...EXTRA]) {
    const p = path.join(DIR, f);
    if (fs.existsSync(p)) h.update(fs.readFileSync(p));
  }
  const build = h.digest('hex').slice(0, 12);

  for (const f of PAGES) {
    const p = path.join(DIR, f);
    if (!fs.existsSync(p)) continue;
    let s = fs.readFileSync(p, 'utf8');
    const tag = `<meta name="build" content="${build}">`;
    if (/<meta name="build" content="[^"]*">/.test(s)) {
      s = s.replace(/<meta name="build" content="[^"]*">/, tag);
    } else {
      s = s.replace(/<head>/i, `<head>\r\n${tag}`);
    }
    fs.writeFileSync(p, s);
  }
  fs.writeFileSync(path.join(DIR, 'version.json'), JSON.stringify({ build }) + '\n');
  return build;
}

// Writing the meta changes the bytes we just hashed, so settle on a fixed point.
let build = stampOnce();
for (let i = 0; i < 5; i++) {
  const next = stampOnce();
  if (next === build) break;
  build = next;
}
console.log(`  build ${build} stamped into ${PAGES.length} pages + version.json`);
