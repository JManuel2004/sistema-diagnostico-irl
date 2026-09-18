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
 * last module on that naming (`scaling-roadmap`) migrated to `roadmap/`
 * in Oleada 5, so that second naming and its element types are gone —
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
      'boundaries/elements': [
        { type: 'shared-kernel', pattern: 'src/shared/kernel/**' },
        {
          type: 'ctx-domain',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/domain/**`,
        },
        {
          type: 'ctx-application',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/application/**`,
        },
        {
          type: 'ctx-infrastructure',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/infrastructure/**`,
        },
        {
          type: 'ctx-presentation',
          pattern: `src/{${DEFINITIVE_LAYER_CONTEXTS}}/presentation/**`,
        },
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
            { from: 'shared-kernel', allow: ['shared-kernel'] },
            {
              // `shared/irl-taxonomy/` and `shared/identity/` are
              // themselves bounded contexts of a different DDD category
              // (Shared Kernel / Anticorruption Layer): their domain
              // layers may be imported directly by any module's domain —
              // see `convenciones-objetivo.md` §1.1, case (b) — instead of
              // only through a port, which is how Core/Supporting
              // contexts communicate with each other. `modules/diagnosis/`,
              // `modules/initiative/`, `modules/routing/` and
              // `modules/roadmap/` (Core/Supporting) share this element
              // type only because they are on the same definitive naming,
              // not because they are Shared Kernel — their own domains
              // still only reach other Core/Supporting domains through a
              // port.
              from: 'ctx-domain',
              allow: ['ctx-domain', 'shared-kernel'],
            },
            {
              from: 'ctx-application',
              allow: ['ctx-application', 'ctx-domain', 'shared-kernel'],
            },
            {
              from: 'ctx-infrastructure',
              allow: [
                'ctx-infrastructure',
                'ctx-application',
                'ctx-domain',
                'shared-kernel',
              ],
            },
            {
              from: 'ctx-presentation',
              allow: ['ctx-presentation', 'ctx-application', 'shared-kernel'],
            },
          ],
        },
      ],
    },
  },
  {
    // Pure-domain constraint: the domain layer imports nothing from a
    // framework or an IO package. Strictest tier, non-negotiable
    // (root CLAUDE.md, "Architectural rules").
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
    files: [`src/{${DEFINITIVE_LAYER_CONTEXTS}}/application/**/*.ts`],
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
