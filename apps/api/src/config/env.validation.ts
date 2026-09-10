import Joi from 'joi';

export const envValidationSchema = Joi.object({
  NODE_ENV: Joi.string()
    .valid('development', 'test', 'production')
    .default('development'),
  APP_PORT: Joi.number().default(3000),
  WEB_ORIGIN: Joi.string().uri().required(),

  DATABASE_URL: Joi.string().uri().required(),
  DATABASE_SCHEMA_DIAGNOSTIC: Joi.string().default('irl_diagnostic'),
  DATABASE_SCHEMA_CATALOG: Joi.string().default('irl_catalog'),

  // Shared INNLAB Cognito User Pool — same values for every product in
  // the ecosystem. Ask the Core team; do not build them from a region.
  COGNITO_JWKS_URI: Joi.string().uri().required(),
  COGNITO_ISSUER: Joi.string().uri().required(),

  // innlab-core-api. `CORE_INTERNAL_KEY` is a static shared secret sent
  // as `x-internal-key` on every /internal/* call.
  INNLAB_API_BASE_URL: Joi.string().uri().required(),
  INNLAB_API_TIMEOUT: Joi.number().default(5000),
  CORE_INTERNAL_KEY: Joi.string().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM: Joi.string().email().required(),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error')
    .default('info'),
});
