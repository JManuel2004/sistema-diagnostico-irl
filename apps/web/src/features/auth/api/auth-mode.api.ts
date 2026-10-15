import { coreSessionSchema } from '@innlab/contracts';
import { http } from '@/shared/api/http';
import { saveSession } from '@/shared/auth/session';

/**
 * Asks the API whether this deploy may skip INNLAB login.
 *
 * A failure means "do not offer the skip": the normal SSO redirect stays
 * in place. The flag is read at runtime, so changing `AUTH_BYPASS` on the
 * API does not require a new frontend build.
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

/** Stores the local session the API issues while the switch is on. */
export async function openBypassSession(): Promise<void> {
  const { data } = await http.post<unknown>('/auth/bypass', {});
  saveSession(coreSessionSchema.parse(data));
}
