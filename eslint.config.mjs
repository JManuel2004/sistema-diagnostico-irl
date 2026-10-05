// eslint.config.mjs
import js from '@eslint/js';
import tseslint from 'typescript-eslint';
import prettier from 'eslint-config-prettier';

export default tseslint.config(
  {
    ignores: [
      '**/dist/**',
      '**/build/**',
      '**/coverage/**',
      '**/node_modules/**',
      'apps/api/jest.config.js',
      'apps/web/vitest.config.js',
      'apps/web/eslint.config.js',
      'apps/web/postcss.config.js',
      'apps/web/tailwind.config.ts',
      // Playwright specs and config are in no tsconfig, so the type-aware rules
      // cannot parse them; `pnpm lint` does not cover them either (web lints src/).
      'apps/web/tests/**',
      'apps/web/playwright.config.ts',
    ],
  },
  js.configs.recommended,
  ...tseslint.configs.recommendedTypeChecked,
  ...tseslint.configs.stylisticTypeChecked,
  {
    languageOptions: {
      parserOptions: {
        projectService: true,
        tsconfigRootDir: import.meta.dirname,
      },
    },
    rules: {
      '@typescript-eslint/consistent-type-imports': ['error', { prefer: 'type-imports' }],
      '@typescript-eslint/no-unused-vars': [
        'error',
        { argsIgnorePattern: '^_', varsIgnorePattern: '^_' },
      ],
      '@typescript-eslint/no-explicit-any': 'error',
      '@typescript-eslint/explicit-function-return-type': 'off',
      '@typescript-eslint/no-floating-promises': 'error',
      '@typescript-eslint/no-misused-promises': 'error',
      'no-console': ['warn', { allow: ['warn', 'error'] }],
      'no-default-export': 'off',
    },
  },
  {
    // Same exception as apps/api/eslint.config.mjs: `unbound-method` fires on
    // every `expect(mock.method).toHaveBeenCalled()`. The pre-commit hook lints
    // staged files with this root config, so it needs it too. Tests only.
    files: ['apps/api/test/**/*.ts'],
    rules: { '@typescript-eslint/unbound-method': 'off' },
  },
  prettier,
);
