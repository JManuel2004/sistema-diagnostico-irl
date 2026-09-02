import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../domain/entities/authenticated-user.vo.js';

/**
 * Reads the authenticated user off the request:
 *
 *   getContext(@CurrentUser() user: AuthenticatedUser) { ... }
 *
 * Only meaningful on routes covered by `JwtAuthGuard` — on a `@Public()`
 * route there is no user and this yields `undefined`.
 */
export const CurrentUser = createParamDecorator(
  (_data: unknown, ctx: ExecutionContext): AuthenticatedUser => {
    const request = ctx
      .switchToHttp()
      .getRequest<{ user: AuthenticatedUser }>();
    return request.user;
  },
);
