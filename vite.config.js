import { defineConfig } from 'vite';
import { resolve } from 'node:path';
import { cpSync, existsSync } from 'node:fs';

export default defineConfig({
  // Ship the standalone scrollyteller as-is into the build output so it deploys
  // at /raysons-scrollyteller/ alongside the v1 site. It's plain static HTML/JS
  // (not part of the Vite module graph), so we copy it verbatim after the build.
  plugins: [
    {
      name: 'copy-scrollyteller',
      apply: 'build',
      closeBundle() {
        const src = resolve(__dirname, 'raysons-scrollyteller');
        const dest = resolve(__dirname, 'dist/raysons-scrollyteller');
        if (existsSync(src)) cpSync(src, dest, { recursive: true });
      },
    },
  ],
  server: {
    port: 3000,
    open: true,
  },
  publicDir: 'public',
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    rollupOptions: {
      input: {
        main: resolve(__dirname, 'index.html'),
        about: resolve(__dirname, 'about.html'),
        technology: resolve(__dirname, 'technology.html'),
        products: resolve(__dirname, 'products.html'),
        enquire: resolve(__dirname, 'enquire.html'),
      },
    },
  },
});
