import { NestFactory } from '@nestjs/core';
import {
  FastifyAdapter,
  type NestFastifyApplication,
} from '@nestjs/platform-fastify';
import { ConfigService } from '@nestjs/config';
import { Logger } from 'nestjs-pino';
import helmet from '@fastify/helmet';
import fastifySwagger, { type StaticDocumentSpec } from '@fastify/swagger';
import fastifySwaggerUi from '@fastify/swagger-ui';
import { DocumentBuilder, SwaggerModule } from '@nestjs/swagger';
import { AppModule } from './app.module.js';
import {
  APP_CONFIG_NAMESPACE,
  type AppConfig,
} from './config/configuration.js';
import { configureApp } from './shared/kernel/infrastructure/http/configure-app.js';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create<NestFastifyApplication>(
    AppModule,
    new FastifyAdapter({ logger: false }),
    { bufferLogs: true },
  );

  app.useLogger(app.get(Logger));

  // CSP disabled: this is a pure API; the only HTML served is the Swagger
  // documentation (outside production), whose UI needs inline scripts that
  // CSP would block.
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

  // The API documentation is served outside production only: in production
  // it would publish the whole surface of the API to anyone.
  if (!cfg.isProduction) {
    const swaggerDocument = SwaggerModule.createDocument(
      app,
      new DocumentBuilder()
        .setTitle('IRL Diagnostic — API')
        .setDescription(
          'IRL maturity diagnostic system · INNLAB · Universidad Icesi',
        )
        .setVersion('1.0')
        .addBearerAuth({ type: 'http', scheme: 'bearer', bearerFormat: 'JWT' })
        .build(),
    );
    // Nest builds the OpenAPI document from the controllers and their DTOs;
    // `@fastify/swagger` publishes it as is (`static` mode) and
    // `@fastify/swagger-ui` serves the UI at `/api/docs` (JSON at
    // `/api/docs/json`).
    await app.register(fastifySwagger, {
      mode: 'static',
      // Nest's `OpenAPIObject` and `openapi-types` describe the same OpenAPI 3
      // document with slightly different typings.
      specification: {
        document: swaggerDocument as unknown as StaticDocumentSpec['document'],
      },
    });
    await app.register(fastifySwaggerUi, { routePrefix: '/api/docs' });
  }

  await app.listen(cfg.appPort, '0.0.0.0');
}

void bootstrap();
