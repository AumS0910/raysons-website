import { defineConfig } from 'vite';
import { resolve } from 'node:path';

export default defineConfig({
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
        industries: resolve(__dirname, 'industries.html'),
        enquire: resolve(__dirname, 'enquire.html'),
      },
    },
  },
});
