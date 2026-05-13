import rootConfig from '../../eslint.config.mjs';
import boundaries from 'eslint-plugin-boundaries';

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
    files: ['src/modules/*/domain/**/*.ts', 'src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: ['@nestjs/*', 'typeorm', '@fastify/*'],
        },
      ],
    },
  },
];
