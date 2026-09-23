import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainExceptionFilter } from './filters/domain-exception.filter.js';
import { ValidationExceptionFilter } from './filters/validation-exception.filter.js';
import { GlobalExceptionFilter } from './filters/global-exception.filter.js';

/**
 * Applies the shared request pipeline: validation pipe, exception filters
 * and version prefix.
 *
 * It exists so `main.ts` and the e2e tests cannot diverge. Before it was
 * extracted, the e2e suite mounted the app with only the `ValidationPipe`
 * and no filter, so any `DomainError` came out as a generic 500 instead of
 * its proper status. The suite only tested happy paths, so the difference
 * went unnoticed — and an e2e test that does not run the same pipeline as
 * production is not testing the system that gets deployed.
 *
 * The order of the filters matters: Nest first tries the one most
 * specifically typed for the thrown exception, and the argument-less
 * `@Catch()` is the safety net.
 */
export function configureApp(app: INestApplication): void {
  app.useGlobalPipes(
    new ValidationPipe({
      whitelist: true,
      forbidNonWhitelisted: true,
      transform: true,
    }),
  );

  const cls = app.get(ClsService);
  app.useGlobalFilters(
    new GlobalExceptionFilter(cls),
    new ValidationExceptionFilter(cls),
    new DomainExceptionFilter(cls),
  );

  app.setGlobalPrefix('api/v1');
}
