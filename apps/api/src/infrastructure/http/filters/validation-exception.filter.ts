import { BadRequestException, Catch, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import type { ProblemDetails } from '../problem-details.js';

/**
 * Translates the `BadRequestException` thrown by NestJS's global
 * `ValidationPipe` (class-validator decorators) into an RFC 7807 problem
 * document with a `validationErrors` array.
 */
@Catch(BadRequestException)
export class ValidationExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(ValidationExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: BadRequestException, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const correlationId = this.cls.get<string>('correlationId');
    const raw = exception.getResponse();
    const errors = this.extractValidationErrors(raw);

    const body: ProblemDetails = {
      type: 'https://errors.innlab.icesi.edu.co/validation-failed',
      title: 'validation failed',
      status: HttpStatus.BAD_REQUEST,
      detail: 'One or more request fields did not satisfy the contract.',
      instance: request.url,
      code: 'VALIDATION_FAILED',
      ...(correlationId ? { correlationId } : {}),
      ...(errors.length > 0 ? { errors } : {}),
    };

    this.logger.warn(
      { correlationId, url: request.url, errors },
      'Validation failed',
    );

    void response
      .status(HttpStatus.BAD_REQUEST)
      .type('application/problem+json')
      .send(body);
  }

  private extractValidationErrors(raw: unknown): Record<string, unknown>[] {
    if (typeof raw !== 'object' || raw === null) return [];
    const candidate = (raw as { message?: unknown }).message;
    if (typeof candidate === 'string') {
      return [{ message: candidate }];
    }
    if (Array.isArray(candidate)) {
      return candidate.map((m: unknown) =>
        typeof m === 'string' ? { message: m } : (m as Record<string, unknown>),
      );
    }
    return [];
  }
}
