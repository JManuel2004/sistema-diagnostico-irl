import rootConfig from '../../eslint.config.mjs';
import boundaries from 'eslint-plugin-boundaries';

/**
 * Backend ESLint flat config.
 *
 * Two layers of rules:
 *
 *  1. `eslint-plugin-boundaries` enforces that modules respect the four-layer
 *     dependency direction (application → usecase → domain ← infrastructure).
 *     Shared kernel may be imported by anyone; it imports nothing else.
 *
 *  2. `no-restricted-imports` denies the specific framework / IO packages,
 *     in two tiers:
 *       - `domain/` (and the shared kernel domain) bans everything.
 *       - `usecase/` and `application/` ban IO but allow the NestJS DI
 *         decorators. See the inline rationale on the second tier below.
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
        { type: 'usecase', pattern: 'src/modules/*/usecase/**' },
        { type: 'application', pattern: 'src/modules/*/application/**' },
        { type: 'infrastructure', pattern: 'src/modules/*/infrastructure/**' },
        { type: 'shared-kernel', pattern: 'src/shared/kernel/**' },
        // `shared/irl-taxonomy/` and `shared/identity/` already carry the
        // definitive four-layer naming (domain/application/infrastructure/
        // presentation) that the rest of `src/modules/*/` migrates to
        // module by module during the structural phase. Kept as separate
        // element types, scoped to `src/shared/{irl-taxonomy,identity}/`
        // only, so the two naming schemes can coexist without colliding.
        {
          type: 'shared-domain',
          pattern: 'src/shared/{irl-taxonomy,identity}/domain/**',
        },
        {
          type: 'shared-application',
          pattern: 'src/shared/{irl-taxonomy,identity}/application/**',
        },
        {
          type: 'shared-infrastructure',
          pattern: 'src/shared/{irl-taxonomy,identity}/infrastructure/**',
        },
        {
          type: 'shared-presentation',
          pattern: 'src/shared/{irl-taxonomy,identity}/presentation/**',
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
            {
              from: 'domain',
              allow: ['domain', 'shared-kernel', 'shared-domain'],
            },
            {
              from: 'usecase',
              allow: ['usecase', 'domain', 'shared-kernel', 'shared-domain', 'shared-application'],
            },
            {
              // The controller layer: it depends on use cases, never on
              // domain or infrastructure directly.
              from: 'application',
              allow: ['application', 'usecase', 'shared-kernel', 'shared-application'],
            },
            {
              from: 'infrastructure',
              allow: [
                'infrastructure',
                'usecase',
                'application',
                'domain',
                'shared-kernel',
                'shared-domain',
                'shared-application',
                'shared-infrastructure',
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
              // contexts communicate with each other.
              from: 'shared-domain',
              allow: ['shared-domain', 'shared-kernel'],
            },
            {
              from: 'shared-application',
              allow: ['shared-application', 'shared-domain', 'shared-kernel'],
            },
            {
              from: 'shared-infrastructure',
              allow: [
                'shared-infrastructure',
                'shared-application',
                'shared-domain',
                'shared-kernel',
              ],
            },
            {
              from: 'shared-presentation',
              allow: ['shared-presentation', 'shared-application', 'shared-kernel'],
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
      'src/modules/*/domain/**/*.ts',
      'src/shared/kernel/domain/**/*.ts',
      'src/shared/{irl-taxonomy,identity}/domain/**/*.ts',
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
    // Both `usecase/` (use cases) and `application/` (controllers) are
    // listed for `src/modules/*/`, still on the intermediate naming; the
    // two `shared/` modules already carry the definitive `application/`
    // (use cases) naming, so `shared/*/application/**` is listed too —
    // same ban, no exception for having moved first.
    files: [
      'src/modules/*/usecase/**/*.ts',
      'src/modules/*/application/**/*.ts',
      'src/shared/{irl-taxonomy,identity}/application/**/*.ts',
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
