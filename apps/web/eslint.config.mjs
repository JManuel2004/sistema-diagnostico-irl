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
      'boundaries/elements': [
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
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['app', 'pages', 'feature', 'shared', 'styles'] },
            { from: 'pages', allow: ['feature', 'shared'] },
            {
              from: 'feature',
              allow: [['feature', { feature: '${from.feature}' }], 'shared'],
            },
            { from: 'shared', allow: ['shared'] },
            { from: 'test', allow: ['app', 'pages', 'feature', 'shared'] },
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
