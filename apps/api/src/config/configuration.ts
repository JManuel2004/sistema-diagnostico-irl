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

/**
 * Cognito — validation of the user access token.
 *
 * The whole INNLAB ecosystem shares a single Cognito User Pool owned by
 * `innlab-core`. Both values are handed over by the Core team; never
 * derive them from a region/pool id of our own. Validation against them
 * is local and offline (JWKS is cached by `jwks-rsa`), so no request to
 * Core or to Cognito happens per HTTP call.
 */
export interface CognitoConfig {
  readonly jwksUri: string;
  readonly issuer: string;
}

/**
 * Outbound calls to `innlab-core-api` `/internal/*`.
 *
 * Authentication is a static shared secret in the `x-internal-key`
 * header — NOT an OAuth `client_credentials` exchange. The key is
 * registered by hand on the Core side (`SERVICE_KEY_ENV` in their
 * `internal.guard.ts`); there is no self-service.
 */
export interface InnLabCoreConfig {
  readonly baseUrl: string;
  readonly timeoutMs: number;
  readonly internalKey: string;
}

/**
 * Mail of the finished report to INNLAB. The notification is off unless
 * there is a destination and a way to send it. `resend` uses HTTPS, which
 * is what a free Render service can do. `smtp` stays for the local inbox.
 */
export interface MailConfig {
  readonly enabled: boolean;
  readonly transport: 'resend' | 'smtp';
  readonly to: string;
  readonly from: string;
  readonly resendApiKey: string;
  readonly host: string;
  readonly port: number;
  readonly user: string;
  readonly password: string;
}

export interface AppConfig {
  readonly nodeEnv: NodeEnv;
  readonly isProduction: boolean;
  readonly appPort: number;
  readonly webOrigin: string;
  readonly logLevel: LogLevel;
  readonly database: DatabaseConfig;
  readonly cognito: CognitoConfig;
  readonly innlabCore: InnLabCoreConfig;
  readonly mail: MailConfig;
  /**
   * Opens the five-person entry. On in production when `AUTH_BYPASS` is
   * unset, so that deploy does not wait on INNLAB.
   */
  readonly authBypass: boolean;
  /** Signs that local session. Ignored while `authBypass` is false. */
  readonly authBypassSecret: string;
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
    cognito: {
      jwksUri: requireString(env.COGNITO_JWKS_URI, 'COGNITO_JWKS_URI'),
      issuer: requireString(env.COGNITO_ISSUER, 'COGNITO_ISSUER'),
    },
    innlabCore: {
      baseUrl: requireString(env.INNLAB_API_BASE_URL, 'INNLAB_API_BASE_URL'),
      timeoutMs: Number(env.INNLAB_API_TIMEOUT ?? 5000),
      internalKey: requireString(env.CORE_INTERNAL_KEY, 'CORE_INTERNAL_KEY'),
    },
    mail: mailConfig(env),
    authBypass: authBypassEnabled(env.AUTH_BYPASS, nodeEnv),
    authBypassSecret:
      env.AUTH_BYPASS_SECRET !== undefined && env.AUTH_BYPASS_SECRET !== ''
        ? env.AUTH_BYPASS_SECRET
        : 'irl-diagnostic-bypass-signing-key',
  };
}

/**
 * Production opens the five-person entry when the variable is unset, so a
 * usability deploy does not depend on INNLAB. `false` keeps the Hub.
 * Any other environment stays on the Hub unless the variable is `true`.
 */
function authBypassEnabled(
  value: string | undefined,
  nodeEnv: string,
): boolean {
  if (value === 'true') return true;
  if (value === 'false') return false;
  return nodeEnv === 'production';
}

function mailConfig(env: NodeJS.ProcessEnv): MailConfig {
  const to = env.REPORT_NOTIFY_TO ?? '';
  const resendApiKey = env.RESEND_API_KEY ?? '';
  const host = env.SMTP_HOST ?? '';
  const useResend = resendApiKey !== '';
  const configuredFrom = env.SMTP_FROM ?? '';
  return {
    enabled: to !== '' && (useResend || host !== ''),
    transport: useResend ? 'resend' : 'smtp',
    to,
    from:
      configuredFrom !== ''
        ? configuredFrom
        : useResend
          ? 'INNLAB Diagnostico <onboarding@resend.dev>'
          : 'noreply@innlab.icesi.edu.co',
    resendApiKey,
    host,
    port: Number(env.SMTP_PORT ?? 1025),
    user: env.SMTP_USER ?? '',
    password: env.SMTP_PASS ?? '',
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
