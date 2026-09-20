/**
 * Cache-busting stamp.
 *
 * The web server sends `Cache-Control: public, max-age=604800` for .js and .css —
 * SEVEN DAYS. So a returning visitor keeps running last week's cinema.js and
 * styles.css no matter what we deploy, and a fix can look "not applied" for a week
 * while the fixed file sits on the server untouched.
 *
 * Images are worse: the server sends them with NO Cache-Control at all, so browsers
 * fall back to HEURISTIC caching and decide for themselves how long to keep a photo.
 * Replacing a portrait in place therefore left visitors looking at the old face with
 * no way to know — the same failure that made earlier HTML fixes look undeployed.
 *
 * This appends a short content hash to every local script/stylesheet/image reference:
 *
 *     <script src="cinema.js">  ->  <script src="cinema.js?v=8f3a21c9">
 *     <img src="images/founder.webp"> -> <img src="images/founder.webp?v=1c04ab77">
 *
 * The hash is derived from the file's bytes, so identical content keeps the same
 * URL (no needless re-downloads) and changed content gets a new one the browser has
 * never seen and must fetch. Run it before deploying; it is idempotent.
 */
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';

const DIR = path.resolve('raysons-scrollyteller');
const PAGES = ['index.html', 'About Us.html', 'foundry.html', 'products.html', 'enquire.html'];

const hash = (rel) => {
  const p = path.join(DIR, rel);
  if (!fs.existsSync(p)) return null;
  return crypto.createHash('sha1').update(fs.readFileSync(p)).digest('hex').slice(0, 8);
};

let changed = 0, stamped = 0;
for (const page of PAGES) {
  const p = path.join(DIR, page);
  if (!fs.existsSync(p)) continue;
  const before = fs.readFileSync(p, 'utf8');
  // local assets only — never touch CDN URLs, and drop any existing ?v= first.
  // Absolute URLs are excluded by the https?:// guard, which also leaves og:image and
  // JSON-LD image fields alone: those are absolute and crawlers should see a stable URL.
  const after = before.replace(
    /((?:src|href)=")((?!https?:|\/\/|data:)[A-Za-z0-9._\-/]+\.(?:js|css|webp|png|jpg|jpeg|svg|avif))(?:\?v=[0-9a-f]{8})?(")/g,
    (m, pre, file, post) => {
      const h = hash(file);
      if (!h) return m;
      stamped++;
      return `${pre}${file}?v=${h}${post}`;
    },
  );
  // srcset too. A <picture> serves its <source srcset> in preference to the <img src>
  // fallback, so leaving srcset unstamped means the file people ACTUALLY get is the one
  // URL with no cache bust on it — and under the immutable policy that would pin a stale
  // image for a year. Candidates are comma-separated and may carry a 2x/640w descriptor,
  // so each is split off its descriptor, stamped, and put back.
  const after2 = after.replace(
    /(srcset=")([^"]+)(")/g,
    (m, pre, list, post) => {
      const out = list.split(',').map((cand) => {
        const t = cand.trim();
        if (!t) return null;
        const sp = t.search(/\s/);
        let url = sp === -1 ? t : t.slice(0, sp);
        const desc = sp === -1 ? '' : t.slice(sp);
        if (/^(https?:|\/\/|data:)/.test(url)) return t;
        url = url.replace(/\?v=[0-9a-f]{8}$/, '');
        const h = hash(url);
        if (!h) return t;
        stamped++;
        return `${url}?v=${h}${desc}`;
      }).filter(Boolean).join(', ');
      return `${pre}${out}${post}`;
    },
  );
  if (after2 !== before) { fs.writeFileSync(p, after2, 'utf8'); changed++; }
}
console.log(`  stamped ${stamped} asset references across ${changed} page(s)`);
