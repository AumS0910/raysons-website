// Vercel build. The site is plain static HTML/CSS/JS — there is nothing to compile —
// so this just places it where Vercel serves from.
//
// It used to be a Vite build of a first-generation site that lived at the repo root and
// copied this folder in afterwards. That site was retired: every one of its URLs is
// redirected to /raysons-scrollyteller/ by vercel.json, and none of its assets were
// reachable in production. It has been removed, and with it the need for a bundler.
import { cpSync, existsSync, mkdirSync, rmSync } from 'node:fs';
import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';

const root = dirname(fileURLToPath(import.meta.url));
const src = resolve(root, 'raysons-scrollyteller');
const out = resolve(root, 'dist');

if (!existsSync(src)) {
  console.error('build failed: raysons-scrollyteller/ is missing');
  process.exit(1);
}
rmSync(out, { recursive: true, force: true });
mkdirSync(out, { recursive: true });
cpSync(src, resolve(out, 'raysons-scrollyteller'), { recursive: true });
console.log('built dist/raysons-scrollyteller');
