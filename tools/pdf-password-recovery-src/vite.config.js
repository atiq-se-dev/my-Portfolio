import { defineConfig } from 'vite';
export default defineConfig({
  base: '/tools/pdf-password-recovery/',
  build: { outDir: '../pdf-password-recovery', emptyOutDir: true }
});