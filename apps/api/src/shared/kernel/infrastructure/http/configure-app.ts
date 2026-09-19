import { ValidationPipe } from '@nestjs/common';
import type { INestApplication } from '@nestjs/common';
import { ClsService } from 'nestjs-cls';
import { DomainExceptionFilter } from './filters/domain-exception.filter.js';
import { ValidationExceptionFilter } from './filters/validation-exception.filter.js';
import { GlobalExceptionFilter } from './filters/global-exception.filter.js';

/**
 * Aplica el pipeline de request compartido: pipe de validación, filtros de
 * excepción y prefijo de versión.
 *
 * Existe para que `main.ts` y las pruebas e2e no puedan divergir. Antes de
 * extraerlo, la suite e2e montaba la app solo con el `ValidationPipe` y sin
 * ningún filtro, de modo que cualquier `DomainError` salía como 500
 * genérico en vez del estado que le corresponde. Solo probaba caminos
 * felices, así que la diferencia pasó inadvertida — y una prueba e2e que
 * no ejerce el mismo pipeline que producción no está probando el sistema
 * que se despliega.
 *
 * El orden de los filtros importa: Nest prueba primero el más
 * específicamente tipado para la excepción lanzada, y el `@Catch()` sin
 * argumentos es la red de seguridad.
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
