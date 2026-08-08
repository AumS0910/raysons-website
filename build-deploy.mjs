/**
 * Builds a deploy/ folder holding ONLY the files the five live pages actually
 * reach — no raw masters, no client docx, no prototypes. That folder is what
 * gets uploaded to the web server.
 *
 *   node build-deploy.mjs https://www.raysonsgroup.com/shell-cast
 *
 * The base URL is where the site will live. It rewrites the canonical, og:url
 * and og:image tags, which still point at the old Vercel preview and would
 * otherwise tell Google the preview is the real page.
 */
import fs from 'node:fs';
import path from 'node:path';

const SRC = path.resolve('raysons-scrollyteller');
const OUT = path.resolve('deploy');
const BASE = (process.argv[2] || '').replace(/\/+$/, '');
const OLD_BASE = 'https://raysons-website.vercel.app/raysons-scrollyteller';

if (!BASE) {
  console.error('Usage: node build-deploy.mjs <base-url>');
  console.error('   eg: node build-deploy.mjs https://www.raysonsgroup.com/shell-cast');
  process.exit(1);
}

const ENTRY = ['index.html', 'About Us.html', 'foundry.html', 'products.html', 'enquire.html'];

const norm = (p) => {
  try {
    const clean = decodeURIComponent(p.split('?')[0].split('#')[0]);
    return path.relative(SRC, path.resolve(SRC, clean)).split(path.sep).join('/');
  } catch { return null; }
};

const RX = [
  /(?:src|href|data-src|data-src-mobile|data-poster|poster)\s*=\s*["']([^"']+)["']/gi,
  /url\(\s*["']?([^"')]+)["']?\s*\)/gi,
  /["'`]([A-Za-z0-9_\-./]+\.(?:js|css|glb|gltf|mp4|webm|jpe?g|png|webp|svg|json|hdr|exr|bin|woff2?|pdf))["'`]/gi,
  // og:image and friends name files by absolute URL, so they look unreachable
  new RegExp(OLD_BASE.replace(/[.*+?^${}()|[\]\\]/g, '\\$&') + '/([^"\'\\s]+)', 'gi'),
];

const seen = new Set();
const queue = [...ENTRY];
while (queue.length) {
  const rel = norm(queue.shift());
  if (!rel || rel.startsWith('..') || seen.has(rel)) continue;
  const abs = path.join(SRC, rel);
  if (!fs.existsSync(abs) || fs.statSync(abs).isDirectory()) continue;
  seen.add(rel);
  if (!/\.(html|js|css|json)$/i.test(rel)) continue;
  const txt = fs.readFileSync(abs, 'utf8');
  const base = path.dirname(rel);
  for (const rx of RX) {
    rx.lastIndex = 0;
    let m;
    while ((m = rx.exec(txt))) {
      const v = m[1];
      if (/^(https?:|data:|mailto:|tel:|#|\/\/)/i.test(v)) {
        const own = v.startsWith(OLD_BASE) ? norm(v.slice(OLD_BASE.length + 1)) : null;
        if (own && !own.startsWith('..')) queue.push(own);
        continue;
      }
      const cand = norm(path.join(base, v));
      if (cand && !cand.startsWith('..')) queue.push(cand);
    }
  }
}

fs.rmSync(OUT, { recursive: true, force: true });
let bytes = 0;
for (const rel of [...seen].sort()) {
  const from = path.join(SRC, rel);
  if (!fs.existsSync(from) || fs.statSync(from).isDirectory()) continue;
  const to = path.join(OUT, rel);
  fs.mkdirSync(path.dirname(to), { recursive: true });
  if (/\.html$/i.test(rel)) {
    // point the social/canonical tags at where the site really lives
    const html = fs.readFileSync(from, 'utf8').split(OLD_BASE).join(BASE);
    fs.writeFileSync(to, html, 'utf8');
    bytes += Buffer.byteLength(html);
  } else {
    fs.copyFileSync(from, to);
    bytes += fs.statSync(from).size;
  }
}

console.log(`deploy/  ${seen.size} files, ${(bytes / 1048576).toFixed(1)} MB`);
console.log(`canonical + og tags rewritten to ${BASE}`);
console.log('\nUpload the CONTENTS of deploy/ to the web server.');
