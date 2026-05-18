import { registerAs } from '@nestjs/config';

/**
 * Single source of truth for every environment variable consumed by the API.
 *
 * The shape of `AppConfig` is the only thing the rest of the codebase
 * sees — env-var names appear exclusively in this file. Code elsewhere
 * accesses configuration via the typed namespace, never via
 * `process.env.X` or `ConfigService.get('SOME_VAR_NAME')`. This makes
 * a future rename or remapping (e.g., switching to AWS SSM, K8s
 * secrets, etc.) a single-file change.
 *
 * Validation lives in `env.validation.ts` (Joi). NestJS runs that
 * validator at `ConfigModule.forRoot` time, so by the time
 * `loadAppConfig()` reads `process.env` every value has been coerced
 * and defaulted. Required fields can therefore be read unconditionally
 * — if they were missing, the app would already have refused to boot.
 */
export type NodeEnv = 'development' | 'test' | 'production';
export type LogLevel = 'trace' | 'debug' | 'info' | 'warn' | 'error';

export interface DatabaseConfig {
  readonly url: string;
  readonly schemaDiagnostic: string;
  readonly schemaCatalog: string;
}

export interface KeycloakConfig {
  readonly issuerUrl: string;
  readonly jwksUri: string;
  readonly audience: string;
}

export interface InnLabCoreConfig {
  readonly baseUrl: string;
  readonly clientId: string;
  readonly clientSecret: string;
}

export interface SmtpConfig {
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly pass: string;
  readonly from: string;
}

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly isProduction: boolean;
  readonly appPort: number;
  readonly webOrigin: string;
  readonly logLevel: LogLevel;
  readonly database: DatabaseConfig;
  readonly keycloak: KeycloakConfig;
  readonly innlabCore: InnLabCoreConfig;
  readonly smtp: SmtpConfig;
}

/**
 * Pure builder. Read in two contexts:
 *   - NestJS DI via the `appConfig` namespace below.
 *   - Standalone CLI tools (TypeORM migrations, seed runner) that do
 *     not bootstrap NestJS.
 *
 * The env arg defaults to `process.env`; tests can inject a fixture.
 */
export function loadAppConfig(env: NodeJS.ProcessEnv = process.env): AppConfig {
  const nodeEnv = (env.NODE_ENV ?? 'development') as NodeEnv;

  return {
    nodeEnv,
    isProduction: nodeEnv === 'production',
    appPort: Number(env.APP_PORT ?? 3000),
    webOrigin: requireString(env.WEB_ORIGIN, 'WEB_ORIGIN'),
    logLevel: (env.LOG_LEVEL ?? 'info') as LogLevel,
    database: {
      url: requireString(env.DATABASE_URL, 'DATABASE_URL'),
      schemaDiagnostic: env.DATABASE_SCHEMA_DIAGNOSTIC ?? 'irl_diagnostic',
      schemaCatalog: env.DATABASE_SCHEMA_CATALOG ?? 'irl_catalog',
    },
    keycloak: {
      issuerUrl: requireString(env.KEYCLOAK_ISSUER_URL, 'KEYCLOAK_ISSUER_URL'),
      jwksUri: requireString(env.KEYCLOAK_JWKS_URI, 'KEYCLOAK_JWKS_URI'),
      audience: requireString(env.KEYCLOAK_AUDIENCE, 'KEYCLOAK_AUDIENCE'),
    },
    innlabCore: {
      baseUrl: requireString(env.INNLAB_CORE_BASE_URL, 'INNLAB_CORE_BASE_URL'),
      clientId: requireString(
        env.INNLAB_CORE_CLIENT_ID,
        'INNLAB_CORE_CLIENT_ID',
      ),
      clientSecret: requireString(
        env.INNLAB_CORE_CLIENT_SECRET,
        'INNLAB_CORE_CLIENT_SECRET',
      ),
    },
    smtp: {
      host: requireString(env.SMTP_HOST, 'SMTP_HOST'),
      port: Number(env.SMTP_PORT ?? 587),
      user: requireString(env.SMTP_USER, 'SMTP_USER'),
      pass: requireString(env.SMTP_PASS, 'SMTP_PASS'),
      from: requireString(env.SMTP_FROM, 'SMTP_FROM'),
    },
  };
}

function requireString(value: string | undefined, name: string): string {
  // Joi has already run via ConfigModule.forRoot; this is the CLI safety net.
  if (value === undefined || value === '') {
    throw new Error(
      `Missing required environment variable ${name}. ` +
        `Check apps/api/.env.local against apps/api/.env.example.`,
    );
  }
  return value;
}

/**
 * NestJS namespace registration. Inject with:
 *
 *   constructor(
 *     @Inject(appConfig.KEY) private readonly cfg: ConfigType<typeof appConfig>,
 *   ) {}
 *
 * Or fetch via `ConfigService.get<AppConfig>(APP_CONFIG_NAMESPACE)`.
 */
export const APP_CONFIG_NAMESPACE = 'app';
export const appConfig = registerAs(APP_CONFIG_NAMESPACE, () =>
  loadAppConfig(),
);
