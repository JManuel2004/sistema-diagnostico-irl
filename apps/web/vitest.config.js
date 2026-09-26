import { configDefaults, defineConfig, mergeConfig } from 'vitest/config';
import viteConfig from './vite.config.js';

export default mergeConfig(
  viteConfig,
  defineConfig({
    test: {
      globals: true,
      environment: 'jsdom',
      environmentOptions: {
        jsdom: {
          url: 'http://localhost/',
        },
      },
      setupFiles: ['./src/test/setup.ts'],
      // Playwright specs run with `pnpm test:e2e`, not with Vitest.
      exclude: [...configDefaults.exclude, 'tests/e2e/**'],
      css: false,
      coverage: {
        provider: 'v8',
        reporter: ['text', 'html', 'lcov'],
        exclude: ['**/*.d.ts', '**/*.config.*', 'src/test/**'],
      },
    },
  }),
);
