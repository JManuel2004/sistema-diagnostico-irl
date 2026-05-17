import { Module } from '@nestjs/common';
import { ConfigModule, ConfigService, ConfigType } from '@nestjs/config';
import { TypeOrmModule } from '@nestjs/typeorm';
import { LoggerModule } from 'nestjs-pino';
import { ClsModule, ClsService } from 'nestjs-cls';
import { randomUUID } from 'node:crypto';
import type { IncomingMessage } from 'node:http';
import { envValidationSchema } from './config/env.validation.js';
import {
  APP_CONFIG_NAMESPACE,
  appConfig,
  type AppConfig,
} from './config/configuration.js';
import { buildOrmModuleOptions } from './config/ormconfig.factory.js';
import { ApiV1Module } from './interfaces/http/api-v1.module.js';

/**
 * Composition root of the application.
 *
 * Pipeline order matters: ClsModule must be registered before the Pino
 * logger so that the request scope (and correlation id) is available
 * inside every log line and every global exception filter.
 *
 * Every environment variable is read **only** through the typed
 * `AppConfig` published by `config/configuration.ts`. No `process.env`
 * access here, and no `config.get('SOME_VAR_NAME')` calls — both would
 * defeat the single-source-of-truth contract.
 */
@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
      load: [appConfig],
      validationSchema: envValidationSchema,
      validationOptions: { abortEarly: false },
      envFilePath: ['.env.local', '.env'],
    }),
    ClsModule.forRoot({
      global: true,
      middleware: {
        mount: true,
        generateId: true,
        idGenerator: (req: IncomingMessage) => {
          const header = req.headers['x-correlation-id'];
          return typeof header === 'string' && header.length > 0
            ? header
            : randomUUID();
        },
        setup: (cls, req: IncomingMessage) => {
          cls.set('correlationId', cls.getId());
          cls.set('userAgent', req.headers['user-agent']);
        },
      },
    }),
    LoggerModule.forRootAsync({
      inject: [appConfig.KEY, ClsService],
      useFactory: (cfg: ConfigType<typeof appConfig>, cls: ClsService) => ({
        pinoHttp: {
          level: cfg.logLevel,
          transport: cfg.isProduction
            ? undefined
            : { target: 'pino-pretty', options: { singleLine: true } },
          customProps: () => ({
            correlationId: cls.get<string | undefined>('correlationId'),
          }),
          serializers: {
            req: (req: { id?: string; method?: string; url?: string }) => ({
              id: req.id,
              method: req.method,
              url: req.url,
            }),
          },
        },
      }),
    }),
    TypeOrmModule.forRootAsync({
      inject: [ConfigService],
      useFactory: (config: ConfigService) => {
        const cfg = config.getOrThrow<AppConfig>(APP_CONFIG_NAMESPACE);
        return buildOrmModuleOptions(cfg);
      },
    }),
    ApiV1Module,
  ],
})
export class AppModule {}
