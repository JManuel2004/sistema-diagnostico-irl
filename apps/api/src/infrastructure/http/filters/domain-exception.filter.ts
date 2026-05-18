import { Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import { DomainError } from '../../../shared-kernel/domain/errors/domain-error.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';
import { NotFoundError } from '../../../shared-kernel/domain/errors/not-found.error.js';
import { ForbiddenError } from '../../../shared-kernel/domain/errors/forbidden.error.js';
import { ConflictError } from '../../../shared-kernel/domain/errors/conflict.error.js';
import type { ProblemDetails } from '../problem-details.js';

/**
 * Translates `DomainError` subclasses into RFC 7807 problem-detail responses.
 *
 * Mapping rules:
 * - `InvariantViolationError` → 422 Unprocessable Entity
 * - `NotFoundError`           → 404 Not Found
 * - `ForbiddenError`          → 403 Forbidden
 * - `ConflictError`           → 409 Conflict
 * - any other `DomainError`   → 400 Bad Request (catch-all for new domain errors)
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
    if (error instanceof InvariantViolationError)
      return HttpStatus.UNPROCESSABLE_ENTITY;
    if (error instanceof NotFoundError) return HttpStatus.NOT_FOUND;
    if (error instanceof ForbiddenError) return HttpStatus.FORBIDDEN;
    if (error instanceof ConflictError) return HttpStatus.CONFLICT;
    return HttpStatus.BAD_REQUEST;
  }
}
