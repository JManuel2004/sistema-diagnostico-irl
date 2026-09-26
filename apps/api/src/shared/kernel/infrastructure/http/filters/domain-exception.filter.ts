import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { DomainError } from '../../../domain/errors/domain-error.js';
import { InvariantViolationError } from '../../../domain/errors/invariant-violation.error.js';
import { NotFoundError } from '../../../domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../domain/errors/forbidden.error.js';
import { ConflictError } from '../../../domain/errors/conflict.error.js';
import { MaturityProfileCalculationError } from '../../../../../modules/diagnosis/domain/exceptions/maturity-profile-calculation.error.js';
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
 *
 * Since the `Result<T, E>` adoption, most
 * `DomainError`s that reach here no longer come from a use case throwing
 * directly — they come from `shared/kernel/application/unwrap-result.ts`
 * rethrowing a use case's `Result.err`, one layer higher in
 * `presentation/`. This filter's mapping table is unaffected either way:
 * it only ever sees a thrown `DomainError`, regardless of which layer
 * threw it. Its remaining direct callers are use cases whose failure is
 * genuinely exceptional (infrastructure, a bug) rather than an
 * anticipable business outcome, which stay outside `Result`'s scope by
 * design.
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
    const byCode = STATUS_BY_CODE[error.code];
    if (byCode !== undefined) return byCode;

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
 * Mapping by `code` for the errors that do not fit the base hierarchy.
 *
 * Preferred over adding one `instanceof` per class because the filter would
 * have to import a concrete class from each domain module — it already does
 * with `MaturityProfileCalculationError`, and that inward dependency on a
 * module is exactly what should not multiply. The `code` is the stable
 * contract the frontend and the tests already use; making it also the key
 * of the HTTP status keeps a single source.
 */
const STATUS_BY_CODE: Readonly<Record<string, number>> = {
  // Portfolio routing: the diagnostic or the configuration is not in the
  // state the operation requires. It is not the request's fault.
  ROUTING_CONFIGURATION_MISSING: HttpStatus.CONFLICT,
  ROUTING_PROFILE_NOT_COMPUTED: HttpStatus.CONFLICT,
  ROUTING_RECOMMENDATION_NOT_GENERATED: HttpStatus.CONFLICT,
  // Malformed configuration: the input does not satisfy the contract.
  ROUTING_PREDICATE_COMPILATION_FAILED: HttpStatus.UNPROCESSABLE_ENTITY,
  ROUTING_CALIBRATION_NOT_MONOTONIC: HttpStatus.UNPROCESSABLE_ENTITY,
  // Scaling roadmap: a graph with a cycle or incomplete minimums are
  // configuration defects of the system, not of the request. A 4xx would
  // tell the user the mistake was theirs.
  ROADMAP_NOT_GENERATED: HttpStatus.CONFLICT,
  ROADMAP_CALCULATION_FAILED: HttpStatus.INTERNAL_SERVER_ERROR,
  ROADMAP_GRAPH_HAS_CYCLE: HttpStatus.INTERNAL_SERVER_ERROR,
};
