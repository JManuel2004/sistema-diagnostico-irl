import { Injectable, Optional } from '@nestjs/common';
import type { ExecutionContext } from '@nestjs/common';
import { Reflector } from '@nestjs/core';
import { AuthGuard } from '@nestjs/passport';
import type { Observable } from 'rxjs';
import { AuthBypassPolicy } from '../../application/auth-bypass.policy.js';
import type { AuthenticatedUser } from '../../application/dtos/authenticated-user.js';
import { IS_PUBLIC_KEY } from '../decorators/public.decorator.js';

/**
 * Registered as an `APP_GUARD` (see `identity.module.ts`), so it protects
 * the entire HTTP surface by default. A route opts out only by carrying
 * `@Public()` — fail-closed: a new controller is authenticated the moment
 * it is written, without anyone remembering to guard it.
 */
@Injectable()
export class JwtAuthGuard extends AuthGuard('jwt') {
  private readonly bypass: AuthBypassPolicy;

  constructor(
    private readonly reflector: Reflector,
    @Optional() bypass?: AuthBypassPolicy,
  ) {
    super();
    // Absent in tests that mount the guard alone: the Cognito path stays
    // the only one, which is also the production behavior with the switch off.
    this.bypass = bypass ?? new AuthBypassPolicy(false, 'disabled');
  }

  override canActivate(
    context: ExecutionContext,
  ): boolean | Promise<boolean> | Observable<boolean> {
    const isPublic = this.reflector.getAllAndOverride<boolean>(IS_PUBLIC_KEY, [
      context.getHandler(),
      context.getClass(),
    ]);

    if (isPublic === true) {
      return true;
    }

    if (this.bypass.isEnabled()) {
      const request = context.switchToHttp().getRequest<{
        headers: { authorization?: string | string[] };
        user?: AuthenticatedUser;
      }>();
      const user = this.bypass.authenticate(
        bearerToken(request.headers.authorization),
      );
      if (user !== null) {
        request.user = user;
        return true;
      }
    }

    return super.canActivate(context);
  }
}

function bearerToken(
  header: string | string[] | undefined,
): string | undefined {
  const value = Array.isArray(header) ? header[0] : header;
  if (!value?.startsWith('Bearer ')) return undefined;
  return value.slice('Bearer '.length).trim();
}
