import { Catch, HttpException, HttpStatus, Logger } from '@nestjs/common';
import type { ArgumentsHost, ExceptionFilter } from '@nestjs/common';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { ClsService } from 'nestjs-cls';
import type { ProblemDetails } from '../problem-details.js';

/**
 * Last-resort exception filter. Captures anything not handled by the
 * domain or validation filters and returns an opaque 500 response.
 *
 * The full stack trace is logged with the correlation id; the response
 * body deliberately does not leak internal details.
 */
@Catch()
export class GlobalExceptionFilter implements ExceptionFilter {
  private readonly logger = new Logger(GlobalExceptionFilter.name);

  constructor(private readonly cls: ClsService) {}

  catch(exception: unknown, host: ArgumentsHost): void {
    const ctx = host.switchToHttp();
    const response = ctx.getResponse<FastifyReply>();
    const request = ctx.getRequest<FastifyRequest>();

    const correlationId = this.cls.get<string>('correlationId');
    const { status, code, title, detail } = this.classify(exception);

    const body: ProblemDetails = {
      type: `https://errors.innlab.icesi.edu.co/${code.toLowerCase()}`,
      title,
      status,
      detail,
      instance: request.url,
      code,
      ...(correlationId ? { correlationId } : {}),
    };

    if (status >= 500) {
      this.logger.error(
        { correlationId, url: request.url, err: exception },
        'Unhandled error',
      );
    } else {
      this.logger.warn(
        { correlationId, url: request.url, code },
        `HTTP error: ${title}`,
      );
    }

    void response.status(status).type('application/problem+json').send(body);
  }

  private classify(exception: unknown): {
    status: number;
    code: string;
    title: string;
    detail: string;
  } {
    if (exception instanceof HttpException) {
      const status = exception.getStatus();
      return {
        status,
        code: HttpStatus[status] ?? 'HTTP_ERROR',
        title: exception.message,
        detail: exception.message,
      };
    }
    return {
      status: HttpStatus.INTERNAL_SERVER_ERROR,
      code: 'INTERNAL_ERROR',
      title: 'internal server error',
      detail:
        'An unexpected error occurred. Reference the correlationId in logs.',
    };
  }
}
