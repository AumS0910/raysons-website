/**
 * Cache-busting stamp.
 *
 * The web server sends `Cache-Control: public, max-age=604800` for .js and .css —
 * SEVEN DAYS. So a returning visitor keeps running last week's cinema.js and
 * styles.css no matter what we deploy, and a fix can look "not applied" for a week
 * while the fixed file sits on the server untouched.
 *
 * This appends a short content hash to every local script/stylesheet reference:
 *
 *     <script src="cinema.js">  ->  <script src="cinema.js?v=8f3a21c9">
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
  // local .js / .css only — never touch CDN URLs, and drop any existing ?v= first
  const after = before.replace(
    /((?:src|href)=")((?!https?:|\/\/|data:)[A-Za-z0-9._\-/]+\.(?:js|css))(?:\?v=[0-9a-f]{8})?(")/g,
    (m, pre, file, post) => {
      const h = hash(file);
      if (!h) return m;
      stamped++;
      return `${pre}${file}?v=${h}${post}`;
    },
  );
  if (after !== before) { fs.writeFileSync(p, after, 'utf8'); changed++; }
}
console.log(`  stamped ${stamped} asset references across ${changed} page(s)`);
