import rootConfig from '../../eslint.config.mjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

/**
 * ESLint flat config of the frontend.
 *
 * Three layers, applied in order:
 *
 *   1. Inherits the root config (typescript-eslint type-checked + Prettier).
 *   2. Recommended React + JSX a11y + react-hooks + react-refresh.
 *   3. `eslint-plugin-boundaries` enforces the import direction across
 *      4 layers: app → pages → feature ← shared. Cross-feature imports
 *      are forbidden.
 *
 * Tests inherit the same boundary rules — a violation cannot be "hidden"
 * inside a test. Build configs are ignored explicitly.
 */
export default [
  ...rootConfig,
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'vitest.config.js',
      'postcss.config.js',
      'tailwind.config.ts',
    ],
  },
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    files: ['src/**/*.{ts,tsx}'],
    plugins: {
      'react-hooks': reactHooks,
      'react-refresh': reactRefresh,
      'jsx-a11y': jsxA11y,
      boundaries,
    },
    languageOptions: {
      globals: { ...globals.browser },
    },
    settings: {
      react: { version: 'detect' },
      // The imports use the `@/` and `@features/` aliases of the tsconfig;
      // without a TypeScript-aware resolver the plugin cannot resolve their
      // target, treats it as unresolved and silently skips the check.
      'import/resolver': {
        typescript: { project: './tsconfig.app.json' },
      },
      'boundaries/elements': [
        // Listed first: a test file belongs to no layer and may use the
        // shared test helpers (`src/test/`) next to what it tests.
        { type: 'spec', pattern: 'src/**/__tests__/**' },
        { type: 'app', pattern: 'src/app/**' },
        { type: 'pages', pattern: 'src/pages/**' },
        { type: 'feature', pattern: 'src/features/*/**', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared/**' },
        { type: 'styles', pattern: 'src/styles/**' },
        { type: 'test', pattern: 'src/test/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'react-refresh/only-export-components': [
        'warn',
        { allowConstantExport: true },
      ],
      // Feature isolation.
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            {
              from: { type: 'app' },
              allow: { to: { type: ['app', 'pages', 'feature', 'shared', 'styles'] } },
            },
            { from: { type: 'pages' }, allow: { to: { type: ['feature', 'shared'] } } },
            {
              // A feature reaches only itself and `shared/`, never another feature.
              from: { type: 'feature' },
              allow: [
                { to: { type: 'feature', captured: { feature: '{{ from.captured.feature }}' } } },
                { to: { type: 'shared' } },
              ],
            },
            { from: { type: 'shared' }, allow: { to: { type: 'shared' } } },
            {
              from: { type: 'test' },
              allow: { to: { type: ['app', 'pages', 'feature', 'shared'] } },
            },
            {
              from: { type: 'spec' },
              allow: { to: { type: ['app', 'pages', 'feature', 'shared', 'test', 'spec'] } },
            },
          ],
        },
      ],
    },
  },
  {
    // shadcn/ui primitives — they export components *and* helpers (CVA
    // variants, re-exports of Radix namespaces). The pattern is
    // intentional and mirrors what `shadcn add` generates; Fast Refresh
    // cannot trace through the indirection, so the rule has no useful
    // action here.
    files: ['src/shared/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
