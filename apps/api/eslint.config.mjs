import rootConfig from '../../eslint.config.mjs';
import boundaries from 'eslint-plugin-boundaries';

/**
 * Backend ESLint flat config.
 *
 * Two layers of rules:
 *
 *  1. `eslint-plugin-boundaries` enforces that modules respect the
 *     definitive four-layer dependency direction (presentation →
 *     application → domain ← infrastructure). Shared kernel may be
 *     imported by anyone; it imports nothing else.
 *
 *  2. `no-restricted-imports` denies the specific framework / IO packages,
 *     in two tiers:
 *       - `domain/` (and the shared kernel domain) bans everything.
 *       - `application/` bans IO but allows the NestJS DI decorators.
 *         See the inline rationale on the second tier below.
 *
 * MIGRATION NOTE (historical) — this config used to carry a second,
 * intermediate layer naming (`domain/`, `usecase/`, `application/` as
 * the controller layer) for modules not yet moved to their definitive
 * location, captured as separate `domain`/`usecase`/`application`/
 * `infrastructure` element types alongside the `ctx-*` ones below. The
 * last module on that naming (`scaling-roadmap`) migrated to `roadmap/`,
 * so that second naming and its element types are gone —
 * `ctx-*` is now the only naming, as this note always said it would
 * become.
 */

/** Modules on the definitive four-layer naming. */
const DEFINITIVE_LAYER_CONTEXTS = 'modules/diagnosis,modules/initiative,modules/routing,modules/roadmap,shared/irl-taxonomy,shared/identity';

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
      // Imports are written with the `.js` extension (NodeNext ESM) but the
      // files on disk are `.ts`; without a TypeScript-aware resolver the
      // plugin cannot resolve the target of an import, treats it as
      // unresolved and silently skips the layer check.
      'import/resolver': {
        typescript: { project: './tsconfig.json' },
      },
      // `mode: 'full'` matches each pattern against the whole path from the
      // package root. The default (`folder`) appends its own `**/*` to the
      // pattern and would never match the `.../domain/**` globs below.
      'boundaries/elements': [
        // Listed before `shared-kernel` so the technical layers of the
        // kernel (database tooling, HTTP filters, health probe) are not
        // swallowed by the broader `src/shared/kernel/**` pattern.
        {
          type: 'infra-global',
          mode: 'full',
          pattern: 'src/shared/kernel/{infrastructure,presentation}/**',
        },
        { type: 'shared-kernel', mode: 'full', pattern: 'src/shared/kernel/**' },
        {
          type: 'ctx-domain',
          mode: 'full',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/domain/**`,
        },
        {
          type: 'ctx-application',
          mode: 'full',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/application/**`,
        },
        {
          type: 'ctx-infrastructure',
          mode: 'full',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/infrastructure/**`,
        },
        {
          type: 'ctx-presentation',
          mode: 'full',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/presentation/**`,
        },
        { type: 'config', mode: 'full', pattern: 'src/config/**' },
      ],
    },
    rules: {
      'boundaries/dependencies': [
        'error',
        {
          default: 'disallow',
          rules: [
            { from: { type: 'shared-kernel' }, allow: { to: { type: ['shared-kernel'] } } },
            {
              // `shared/irl-taxonomy/` and `shared/identity/` are
              // themselves bounded contexts of a different DDD category
              // (Shared Kernel / Anticorruption Layer): their domain
              // layers may be imported directly by any module's domain —
              // a read-only query of reference data — instead of
              // only through a port, which is how Core/Supporting
              // contexts communicate with each other. `modules/diagnosis/`,
              // `modules/initiative/`, `modules/routing/` and
              // `modules/roadmap/` (Core/Supporting) share this element
              // type only because they are on the same definitive naming,
              // not because they are Shared Kernel — their own domains
              // still only reach other Core/Supporting domains through a
              // port.
              from: { type: 'ctx-domain' },
              allow: { to: { type: ['ctx-domain', 'shared-kernel'] } },
            },
            {
              from: { type: 'ctx-application' },
              allow: {
                to: { type: ['ctx-application', 'ctx-domain', 'shared-kernel'] },
              },
            },
            {
              from: { type: 'ctx-infrastructure' },
              allow: {
                to: {
                  type: [
                    'ctx-infrastructure',
                    'ctx-application',
                    'ctx-domain',
                    'shared-kernel',
                    'infra-global',
                    'config',
                  ],
                },
              },
            },
            {
              // `presentation/` reaches the domain only through
              // `application/` (use cases and their DTOs).
              from: { type: 'ctx-presentation' },
              allow: {
                to: {
                  type: ['ctx-presentation', 'ctx-application', 'shared-kernel'],
                },
              },
            },
            { from: { type: 'config' }, allow: { to: { type: ['config'] } } },
            {
              // Technical layers of the kernel (DB tooling, HTTP filters,
              // health probe) compose the application: they may import
              // anything.
              from: { type: 'infra-global' },
              allow: { to: { type: '*' } },
            },
          ],
        },
      ],
    },
  },
  {
    // Pure-domain constraint: the domain layer imports nothing from a
    // framework or an IO package. Strictest tier, non-negotiable.
    files: [
      'src/shared/kernel/domain/**/*.ts',
      `src/{${DEFINITIVE_LAYER_CONTEXTS}}/domain/**/*.ts`,
    ],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...FRAMEWORK_PACKAGES, ...IO_PACKAGES] },
      ],
    },
  },
  {
    // Application layer: no framework and no IO either. Use cases and
    // queries are plain classes; each module binds them with
    // `applicationProvider()` (a `useFactory` + `inject:` list), and they
    // publish domain events through the `EventPublisher` port.
    files: [`src/{${DEFINITIVE_LAYER_CONTEXTS}}/application/**/*.ts`],
    rules: {
      'no-restricted-imports': [
        'error',
        { patterns: [...FRAMEWORK_PACKAGES, ...IO_PACKAGES] },
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
