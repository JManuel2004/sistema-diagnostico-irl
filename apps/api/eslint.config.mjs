import rootConfig from '../../eslint.config.mjs';
import boundaries from 'eslint-plugin-boundaries';

/**
 * Backend ESLint flat config.
 *
 * Two layers of rules:
 *
 *  1. `eslint-plugin-boundaries` enforces that modules respect the four-layer
 *     dependency direction (application → usecase → domain ← infrastructure,
 *     or presentation → application → domain ← infrastructure for modules
 *     already on the definitive layout — see the migration note below).
 *     Shared kernel may be imported by anyone; it imports nothing else.
 *
 *  2. `no-restricted-imports` denies the specific framework / IO packages,
 *     in two tiers:
 *       - `domain/` (and the shared kernel domain) bans everything.
 *       - `usecase/`/`application/` ban IO but allow the NestJS DI
 *         decorators. See the inline rationale on the second tier below.
 *
 * MIGRATION NOTE — two layer namings coexist during the structural phase
 * (`convenciones-objetivo.md` §2). `portfolio-routing` and
 * `scaling-roadmap` are the only modules still on the intermediate naming
 * from the mechanical phase (`domain/`, `usecase/`, `application/` as the
 * controller layer). Everything already moved to its definitive location
 * — `shared/irl-taxonomy/`, `shared/identity/`, `modules/diagnosis/` —
 * uses the definitive four layers (`domain/`, `application/` as use
 * cases, `infrastructure/`, `presentation/`), captured here as the
 * `ctx-*` element types so the two namings do not collide: the old
 * wildcards are scoped explicitly to the two modules that still need
 * them instead of matching `src/modules/*` generically, otherwise
 * `modules/diagnosis/application/` (use cases) would be misread as the
 * old scheme's controller layer. Once `portfolio-routing` and
 * `scaling-roadmap` migrate (Oleadas 4 and 5), the old element types and
 * this note are removed and `ctx-*` becomes the only naming.
 */

/** Modules still on the intermediate `application/`-as-controller naming. */
const LEGACY_LAYER_MODULES = '{portfolio-routing,scaling-roadmap}';

/** Modules already on the definitive four-layer naming. */
const DEFINITIVE_LAYER_CONTEXTS = 'modules/diagnosis,modules/initiative,shared/irl-taxonomy,shared/identity';

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
        // Intermediate naming — scoped to the two modules still on it.
        { type: 'domain', pattern: `src/modules/${LEGACY_LAYER_MODULES}/domain/**` },
        { type: 'usecase', pattern: `src/modules/${LEGACY_LAYER_MODULES}/usecase/**` },
        {
          type: 'application',
          pattern: `src/modules/${LEGACY_LAYER_MODULES}/application/**`,
        },
        {
          type: 'infrastructure',
          pattern: `src/modules/${LEGACY_LAYER_MODULES}/infrastructure/**`,
        },
        { type: 'shared-kernel', pattern: 'src/shared/kernel/**' },
        // Definitive naming — `shared/irl-taxonomy/`, `shared/identity/`
        // and `modules/diagnosis/` (see MIGRATION NOTE above).
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
            { from: 'domain', allow: ['domain', 'shared-kernel', 'ctx-domain'] },
            {
              from: 'usecase',
              allow: ['usecase', 'domain', 'shared-kernel', 'ctx-domain', 'ctx-application'],
            },
            {
              // The controller layer: it depends on use cases, never on
              // domain or infrastructure directly.
              from: 'application',
              allow: ['application', 'usecase', 'shared-kernel', 'ctx-application'],
            },
            {
              from: 'infrastructure',
              allow: [
                'infrastructure',
                'usecase',
                'application',
                'domain',
                'shared-kernel',
                'ctx-domain',
                'ctx-application',
                'ctx-infrastructure',
              ],
            },
            { from: 'shared-kernel', allow: ['shared-kernel'] },
            {
              // `shared/irl-taxonomy/` and `shared/identity/` are
              // themselves bounded contexts of a different DDD category
              // (Shared Kernel / Anticorruption Layer): their domain
              // layers may be imported directly by any module's domain —
              // see `convenciones-objetivo.md` §1.1, case (b) — instead of
              // only through a port, which is how Core/Supporting
              // contexts communicate with each other. `modules/diagnosis/`
              // (Core) shares this element type only because it is on the
              // same definitive naming, not because it is Shared Kernel —
              // its own domain still only reaches other Core/Supporting
              // domains through a port, same as `domain`/`usecase` above.
              from: 'ctx-domain',
              allow: ['ctx-domain', 'shared-kernel'],
            },
            {
              from: 'ctx-application',
              allow: [
                'ctx-application',
                'ctx-domain',
                'shared-kernel',
                // A module on the definitive naming can still depend on a
                // not-yet-migrated module's exported use case (e.g.
                // `portfolio-routing`/`scaling-roadmap` importing
                // `modules/diagnosis`'s `GetMaturityProfileUseCase`) —
                // that dependency runs the other way today (legacy
                // `usecase` importing `ctx-application`, already allowed
                // above); this direction is symmetric for the reverse
                // case once those two modules migrate.
                'usecase',
              ],
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
      `src/modules/${LEGACY_LAYER_MODULES}/domain/**/*.ts`,
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
    //
    // `usecase/` and `application/` (controllers) cover the two modules
    // still on the intermediate naming; `application/` (use cases) under
    // the definitive contexts covers the rest — same ban either way.
    files: [
      `src/modules/${LEGACY_LAYER_MODULES}/usecase/**/*.ts`,
      `src/modules/${LEGACY_LAYER_MODULES}/application/**/*.ts`,
      `src/{${DEFINITIVE_LAYER_CONTEXTS}}/application/**/*.ts`,
    ],
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
