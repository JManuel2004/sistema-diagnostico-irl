import { SetMetadata } from '@nestjs/common';
import type { CustomDecorator } from '@nestjs/common';

/**
 * Exempts a route from the global `JwtAuthGuard`.
 *
 * Everything is authenticated by default, so this decorator is the only
 * way a route becomes reachable without a bearer token. Reserved for
 * liveness/readiness probes; adding it anywhere else is a deliberate
 * decision to expose that endpoint to the internet.
 */
export const IS_PUBLIC_KEY = 'isPublic';

export const Public = (): CustomDecorator<string> =>
  SetMetadata(IS_PUBLIC_KEY, true);
