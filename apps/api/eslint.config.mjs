import rootConfig from '../../eslint.config.mjs';
import boundaries from 'eslint-plugin-boundaries';

/**
 * Backend ESLint flat config.
 *
 * Two layers of rules:
 *
 *  1. `eslint-plugin-boundaries` enforces that modules respect the four-layer
 *     dependency direction (interfaces → application → domain ← infrastructure).
 *     Shared kernel may be imported by anyone; it imports nothing else.
 *
 *  2. `no-restricted-imports` denies the specific framework / IO packages
 *     listed in CLAUDE.api.md for any code that lives inside a `domain/` or
 *     `application/` folder (including the shared kernel domain).
 */
export default [
  ...rootConfig,
  {
    files: ['src/**/*.ts'],
    plugins: { boundaries },
    settings: {
      'boundaries/elements': [
        { type: 'domain', pattern: 'src/modules/*/domain/**' },
        { type: 'application', pattern: 'src/modules/*/application/**' },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'interfaces', pattern: 'src/modules/*/interfaces/**' },
        { type: 'shared-kernel', pattern: 'src/shared-kernel/**' },
        { type: 'config', pattern: 'src/config/**' },
        { type: 'infra-global', pattern: 'src/infrastructure/**' },
      ],
    },
    rules: {
      'boundaries/element-types': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: 'domain', allow: ['domain', 'shared-kernel'] },
            {
              from: 'application',
              allow: ['application', 'domain', 'shared-kernel'],
            },
            {
              from: 'infrastructure',
              allow: [
                'infrastructure',
                'application',
                'domain',
                'shared-kernel',
              ],
            },
            {
              from: 'interfaces',
              allow: ['interfaces', 'application', 'shared-kernel'],
            },
            { from: 'shared-kernel', allow: ['shared-kernel'] },
          ],
        },
      ],
    },
  },
  {
    // Pure-domain constraint: no framework imports anywhere in domain or
    // application layers (modules or shared kernel).
    files: [
      'src/modules/*/domain/**/*.ts',
      'src/modules/*/application/**/*.ts',
      'src/shared-kernel/domain/**/*.ts',
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            '@nestjs/*',
            'typeorm',
            '@fastify/*',
            'fastify',
            'axios',
            'undici',
            'nodemailer',
            'pino',
            'pino-*',
            'nestjs-pino',
            'nestjs-cls',
            'fs',
            'node:fs',
            'http',
            'node:http',
            'https',
            'node:https',
            'net',
            'node:net',
          ],
        },
      ],
    },
  },
];
