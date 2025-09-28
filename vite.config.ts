import { defineConfig } from 'vite';
import path from 'node:path';

export default defineConfig({
  root: '.',
  build: {
    outDir: 'dist',
    emptyOutDir: true,
    rollupOptions: {
      input: {
        plugin: path.resolve(__dirname, 'src/plugin.ts'),
        ui: path.resolve(__dirname, 'src/ui.html')
      },
      output: {
        entryFileNames: (chunk) => {
          if (chunk.name === 'plugin') {
            return 'plugin.js';
          }
          return 'assets/[name].js';
        },
        chunkFileNames: 'assets/[name]-[hash].js',
        assetFileNames: (asset) => {
          if (asset.name && asset.name.endsWith('.html')) {
            return '[name][extname]';
          }
          return 'assets/[name][extname]';
        }
      }
    }
  }
});
