import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ValidationPipe } from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import { ClsService } from 'nestjs-cls';
import helmet from '@fastify/helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import {
  APP_CONFIG_NAMESPACE,
  type AppConfig,
} from './config/configuration.js';
import { DomainExceptionFilter } from './infrastructure/http/filters/domain-exception.filter.js';
import { ValidationExceptionFilter } from './infrastructure/http/filters/validation-exception.filter.js';
import { GlobalExceptionFilter } from './infrastructure/http/filters/global-exception.filter.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  // CSP desactivado: esta es una API pura; el único HTML servido es la
  // documentación Swagger, cuyo UI requiere scripts inline que CSP bloquearía.
  await app.register(helmet, { contentSecurityPolicy: false });

  // Single source of truth: the typed `AppConfig` published by
  // `config/configuration.ts`. We resolve it once and read every
  // bootstrap-time setting from the typed object.
  const cfg = app
    .get(ConfigService)
    .getOrThrow<AppConfig>(APP_CONFIG_NAMESPACE);

  app.enableCors({
    origin: cfg.webOrigin,
    credentials: true,
  });

  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  // Filter resolution: Nest tries the most-specifically-typed filter first
  // for a thrown exception; the catch-all (`@Catch()`) is the safety net.
  const cls = app.get(ClsService);
  app.useGlobalFilters(
    new GlobalExceptionFilter(cls),
    new ValidationExceptionFilter(cls),
    new DomainExceptionFilter(cls),
  );

  app.setGlobalPrefix('api/v1');

  const swaggerDocument = SwaggerModule.createDocument(
    app,
    new DocumentBuilder()
      .setTitle('Diagnóstico IRL — API')
      .setDescription(
        'Sistema de diagnóstico de madurez IRL · INNLAB · Universidad Icesi',
      )
      .setVersion('1.0')
      .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
      .build(),
  );
  SwaggerModule.setup('api/docs', app, swaggerDocument);

  await app.listen(cfg.appPort, '0.0.0.0');
}

void bootstrap();
