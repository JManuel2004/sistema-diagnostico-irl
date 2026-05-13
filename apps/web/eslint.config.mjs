import rootConfig from '../../eslint.config.mjs';
import react from 'eslint-plugin-react';
import reactHooks from 'eslint-plugin-react-hooks';
import jsxA11y from 'eslint-plugin-jsx-a11y';
import boundaries from 'eslint-plugin-boundaries';

export default [
  ...rootConfig,
  {
    ignores: ['vitest.config.js', 'eslint.config.js', 'playwright.config.ts'],
  },
  react.configs.flat.recommended,
  react.configs.flat['jsx-runtime'],
  {
    plugins: {
      'react-hooks': reactHooks,
      'jsx-a11y': jsxA11y,
      boundaries,
    },
    settings: {
      react: { version: 'detect' },
      'boundaries/elements': [
        { type: 'app', pattern: 'src/app/**' },
        { type: 'pages', pattern: 'src/pages/**' },
        { type: 'feature', pattern: 'src/features/*/**', capture: ['feature'] },
        { type: 'shared', pattern: 'src/shared/**' },
      ],
    },
    rules: {
      ...reactHooks.configs.recommended.rules,
      ...jsxA11y.configs.recommended.rules,
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'app', allow: ['app', 'pages', 'feature', 'shared'] },
            { from: 'pages', allow: ['feature', 'shared'] },
            { from: 'feature', allow: [['feature', { feature: '${from.feature}' }], 'shared'] },
            { from: 'shared', allow: ['shared'] },
          ],
        },
      ],
    },
  },
];
