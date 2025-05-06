import { defineConfig } from 'vite';

export default defineConfig({
  base: '/7v7Simulator/',
  server: {
    open: true
  },
  build: {
    outDir: 'dist',
    assetsDir: 'assets',
    sourcemap: true,
    rollupOptions: {
      external: ['three', 'cannon-es'],
      output: {
        globals: {
          'three': 'THREE',
          'cannon-es': 'CANNON'
        }
      }
    }
  },
  optimizeDeps: {
    include: ['three', 'cannon-es']
  }
}); 