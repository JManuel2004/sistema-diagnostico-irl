import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { DomainError } from '../../../shared-kernel/domain/errors/domain-error.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';
import { NotFoundError } from '../../../shared-kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../shared-kernel/domain/errors/forbidden.error.js';
import { ConflictError } from '../../../shared-kernel/domain/errors/conflict.error.js';
import { MaturityProfileCalculationError } from '../../../modules/maturity-profile/domain/errors/maturity-profile-calculation.error.js';
import type { ProblemDetails } from '../problem-details.js';

/**
 * Translates `DomainError` subclasses into RFC 7807 problem-detail responses.
 *
 * Mapping rules:
 * - `InvariantViolationError`           → 422 Unprocessable Entity
 * - `NotFoundError`                     → 404 Not Found
 * - `ForbiddenError`                    → 403 Forbidden
 * - `ConflictError`                     → 409 Conflict
 * - `MaturityProfileCalculationError`   → 500 Internal Server Error (DIAGIRL-34 error scenario)
 * - any other `DomainError`             → 400 Bad Request (catch-all for new domain errors)
 *
 * Errors that do not fit that hierarchy map by their stable `code` — see
 * `STATUS_BY_CODE` at the bottom of this file.
 */
@Catch(DomainError)
export class DomainExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(DomainExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: DomainError, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const status = this.statusFor(exception);
    const correlationId = this.cls.get<string>('correlationId');

    const body: ProblemDetails = {
      type: `https://errors.innlab.icesi.edu.co/${exception.code.toLowerCase()}`,
      title: exception.code.replace(/_/g, ' ').toLowerCase(),
      status,
      detail: exception.message,
      instance: request.url,
      code: exception.code,
      ...(correlationId ? { correlationId } : {}),
    };

    this.logger.warn(
      { code: exception.code, status, correlationId, url: request.url },
      `Domain error: ${exception.message}`,
    );

    void response.status(status).type('application/problem+json').send(body);
  }

  private statusFor(error: DomainError): number {
    const porCodigo = STATUS_BY_CODE[error.code];
    if (porCodigo !== undefined) return porCodigo;

    if (error instanceof InvariantViolationError)
      return HttpStatus.UNPROCESSABLE_ENTITY;
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    if (error instanceof MaturityProfileCalculationError)
      return HttpStatus.INTERNAL_SERVER_ERROR;
    return HttpStatus.BAD_REQUEST;
  }
}

/**
 * Mapeo por `code` para los errores que no encajan en la jerarquía base.
 *
 * Se prefiere a añadir un `instanceof` por clase porque el filtro tendría
 * que importar una clase concreta de cada módulo de dominio —ya lo hace
 * con `MaturityProfileCalculationError`, y esa dependencia hacia dentro de
 * un módulo es justo lo que no conviene multiplicar. El `code` es el
 * contrato estable que el frontend y las pruebas ya usan; que sea también
 * la clave del estado HTTP mantiene una sola fuente.
 *
 * Catálogo completo en `docs/error-codes.md`.
 */
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  // Enrutamiento de portafolio: el diagnóstico o la configuración no están
  // en el estado que la operación requiere. No es culpa de la petición.
  ROUTING_NO_ACTIVE_CONFIGURATION: HttpStatus.CONFLICT,
  ROUTING_PROFILE_NOT_COMPUTED: HttpStatus.CONFLICT,
  ROUTING_RECOMMENDATION_NOT_GENERATED: HttpStatus.CONFLICT,
  ROUTING_DRAFT_HAS_BLOCKING_FINDINGS: HttpStatus.CONFLICT,
  // Configuración malformada: la entrada no satisface el contrato.
  ROUTING_PREDICATE_COMPILATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  ROUTING_CALIBRATION_NOT_MONOTONIC: HttpStatus.UNPROCESSABLE_ENTITY,
  ROUTING_CONFIGURATION_INVALID: HttpStatus.UNPROCESSABLE_ENTITY,
};
