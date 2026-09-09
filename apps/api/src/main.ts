import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import {
  APP_CONFIG_NAMESPACE,
  type AppConfig,
} from './config/configuration.js';
import { configureApp } from './infrastructure/http/configure-app.js';

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

  // Pipes, exception filters and the version prefix. Shared with the e2e
  // suite so the two cannot drift apart.
  configureApp(app);

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
