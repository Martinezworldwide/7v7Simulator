import { defineConfig } from 'vite';

export default defineConfig({
  base: '/7v7Simulator/',
  server: {
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true
  }
}); 