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
 *     listed in CLAUDE.api.md, in two tiers:
 *       - `domain/` (and the shared kernel domain) bans everything.
 *       - `application/` bans IO but allows the NestJS DI decorators.
 *     See the inline rationale on the second tier below.
 */

/** Framework packages. Banned outright in `domain/`. */
const FRAMEWORK_PACKAGES = [
  '@nestjs/*',
  '@fastify/*',
  'fastify',
  'nestjs-pino',
  'nestjs-cls',
];

/** IO packages. Banned in `domain/` *and* in `application/`. */
const IO_PACKAGES = [
  'typeorm',
  'axios',
  'undici',
  'nodemailer',
  'pino',
  'pino-*',
  'fs',
  'node:fs',
  'http',
  'node:http',
  'https',
  'node:https',
  'net',
  'node:net',
];

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
    // Pure-domain constraint: the domain layer imports nothing from a
    // framework or an IO package. Strictest tier, non-negotiable
    // (root CLAUDE.md, "Architectural rules").
    files: ['src/modules/*/domain/**/*.ts', 'src/shared-kernel/domain/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...FRAMEWORK_PACKAGES, ...IO_PACKAGES] },
      ],
    },
  },
  {
    // Application layer: IO stays banned, the NestJS DI decorators do not.
    //
    // Why the exception (ADR-001). Use cases are wired as providers and
    // resolve their ports by `Symbol`, which needs `@Inject(TOKEN)` on the
    // constructor parameters. The alternative — one `useFactory` + `inject:`
    // binding per use case, the way `GetQuestionnaireStructureQuery` does it
    // — keeps the layer literally framework-free but multiplies the wiring
    // boilerplate in every module without buying any real decoupling: the
    // dependency still points at the port and never at the adapter, which is
    // the property that actually matters.
    //
    // The ban that carries the architectural weight is on IO — persistence,
    // HTTP clients, mailers, filesystem, sockets. That one stays intact, and
    // so does the ban on the NestJS packages that have no business here
    // (`@nestjs/core`, `@nestjs/typeorm`, the platform adapters).
    files: ['src/modules/*/application/**/*.ts'],
    rules: {
      'no-restricted-imports': [
        'error',
        {
          patterns: [
            ...FRAMEWORK_PACKAGES.filter((p) => p !== '@nestjs/*'),
            ...IO_PACKAGES,
            '@nestjs/core',
            '@nestjs/typeorm',
            '@nestjs/platform-*',
          ],
        },
      ],
    },
  },
  {
    // `unbound-method` fires on every `expect(mock.method).toHaveBeenCalled()`
    // because the assertion passes the method as a value. It is a documented
    // false positive with Jest mocks — the upstream fix is the `jest/`
    // variant of the rule from `eslint-plugin-jest`, which this project does
    // not install. Scoped off in tests only; production code keeps the rule.
    files: ['test/**/*.ts'],
    rules: {
      '@typescript-eslint/unbound-method': 'off',
    },
  },
];
