import { createParamDecorator } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import type { AuthenticatedUser } from '../../application/dtos/authenticated-user.js';

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
