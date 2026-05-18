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

  KEYCLOAK_ISSUER_URL: Joi.string().uri().required(),
  KEYCLOAK_JWKS_URI: Joi.string().uri().required(),
  KEYCLOAK_AUDIENCE: Joi.string().required(),

  INNLAB_CORE_BASE_URL: Joi.string().uri().required(),
  INNLAB_CORE_CLIENT_ID: Joi.string().required(),
  INNLAB_CORE_CLIENT_SECRET: Joi.string().required(),

  SMTP_HOST: Joi.string().required(),
  SMTP_PORT: Joi.number().default(587),
  SMTP_USER: Joi.string().required(),
  SMTP_PASS: Joi.string().required(),
  SMTP_FROM: Joi.string().email().required(),

  LOG_LEVEL: Joi.string()
    .valid('trace', 'debug', 'info', 'warn', 'error')
    .default('info'),
});
