import rootConfig from '../../eslint.config.mjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import reactRefresh from 'eslint-plugin-react-refresh';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';
import globals from 'globals';

/**
 * ESLint flat-config del frontend.
 *
 * Tres capas, aplicadas en orden:
 *
 *   1. Hereda el config raíz (typescript-eslint type-checked + Prettier).
 *   2. Recommended React + JSX a11y + react-hooks + react-refresh.
 *   3. `eslint-plugin-boundaries` aplica la dirección de import en
 *      4 capas documentada en CLAUDE.web.md: app → pages → feature ←
 *      shared. Cross-feature imports están prohibidos.
 *
 * Los tests heredan las mismas reglas de fronteras — no se puede
 * "esconder" una violación dentro de un test. Los configs de build
 * se ignoran explícitamente.
 */
export default [
  ...rootConfig,
  {
    ignores: [
      'dist/**',
      'coverage/**',
      'playwright-report/**',
      'vitest.config.js',
      'playwright.config.ts',
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
      // Aislamiento por feature — refleja la tabla de
      // CLAUDE.web.md §"Allowed import paths".
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
    // Primitivos shadcn/ui — exportan componentes *y* helpers (CVA
    // variants, re-exports de namespaces Radix). El patrón es
    // intencional y replica lo que `shadcn add` genera; Fast Refresh
    // no puede trazar por la indirección, así que la regla aquí no
    // tiene acción útil.
    files: ['src/shared/ui/**/*.tsx'],
    rules: {
      'react-refresh/only-export-components': 'off',
    },
  },
];
