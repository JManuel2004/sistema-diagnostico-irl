import { coreSessionSchema } from '@innlab/contracts';
import { http, isApiErrorWithStatus } from '@/shared/api/http';
import { saveSession } from '@/shared/auth/session';

/**
 * Asks the API whether this deploy is in validation mode.
 *
 * A failure means "use the real login". The flag is read at runtime, so
 * changing `AUTH_BYPASS` on the API does not require a new frontend build.
 */
export async function fetchAuthBypass(): Promise<boolean> {
  try {
    const { data } = await http.get<unknown>('/auth/mode');
    if (typeof data !== 'object' || data === null || !('bypass' in data)) {
      return false;
    }
    return data.bypass === true;
  } catch {
    return false;
  }
}

/**
 * Enters without INNLAB when validation mode is on and auth has failed to
 * answer promptly three times. Returns false when the real login must continue,
 * including a 404 from an API that found INNLAB responsive.
 */
export async function enterIfAuthIsUnresponsive(): Promise<boolean> {
  if (!(await fetchAuthBypass())) return false;

  try {
    const { data } = await http.post<unknown>('/auth/bypass', {});
    saveSession(coreSessionSchema.parse(data));
    return true;
  } catch (error) {
    if (isApiErrorWithStatus(error, 404)) return false;
    throw error;
  }
}
