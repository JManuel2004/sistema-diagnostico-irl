import { copyFileSync } from 'node:fs';
import path from 'node:path';
import { defineConfig, type Plugin } from 'vite';
import react from '@vitejs/plugin-react';
import { visualizer } from 'rollup-plugin-visualizer';

/**
 * Vercel serves this file when a route has no static asset, so /panel and
 * the rest open the app. The directory is the build's own outDir: a test
 * builds into a temp folder, and a missing apps/web/dist must not fail it.
 */
function spaFallback404(): Plugin {
  let indexHtml = '';
  let notFoundHtml = '';
  return {
    name: 'spa-fallback-404',
    apply: 'build',
    configResolved(config) {
      const outDir = path.resolve(config.root, config.build.outDir);
      indexHtml = path.join(outDir, 'index.html');
      notFoundHtml = path.join(outDir, '404.html');
    },
    closeBundle() {
      copyFileSync(indexHtml, notFoundHtml);
    },
  };
}

export default defineConfig({
  plugins: [
    react(),
    spaFallback404(),
    visualizer({ filename: 'dist/stats.html', gzipSize: true, brotliSize: true }),
  ],
  resolve: {
    alias: {
      '@innlab/contracts': path.resolve(__dirname, '../../packages/contracts/src/index.ts'),
      '@': path.resolve(__dirname, './src'),
      '@app': path.resolve(__dirname, './src/app'),
      '@features': path.resolve(__dirname, './src/features'),
      '@pages': path.resolve(__dirname, './src/pages'),
      '@shared': path.resolve(__dirname, './src/shared'),
    },
  },
  server: {
    port: 5173,
    proxy: {
      '/api': {
        target: 'http://localhost:3000',
        changeOrigin: true,
      },
    },
  },
  build: {
    target: 'es2022',
    sourcemap: true,
    rollupOptions: {
      output: {
        manualChunks: {
          recharts: ['recharts'],
          radix: ['@radix-ui/react-radio-group', '@radix-ui/react-tabs', '@radix-ui/react-tooltip'],
        },
      },
    },
  },
});
