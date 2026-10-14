import { defineConfig } from 'vite';

export default defineConfig({
  // The final page will be published at /tools/pdf-password-recovery/.
  base: '/tools/pdf-password-recovery/',
  build: {
    // GitHub Actions builds the site into the public tools URL folder.
    outDir: '../pdf-password-recovery',
    emptyOutDir: true
  }
});
