import { meContextResponseSchema, type MeContextResponse } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

/**
 * Context of the active session: the user's identity and organizational
 * membership.
 *
 * It goes to this system's backend, not to INNLAB Core. The browser never
 * calls Core's `/internal/*`: that surface requires the service credential
 * and is strictly backend-to-backend. The backend mediates and exposes only
 * what the frontend needs.
 */
export function getMeContext(): Promise<MeContextResponse> {
  return getParsed('/me/context', meContextResponseSchema);
}
