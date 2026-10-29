import { coreSessionSchema } from '@innlab/contracts';
import { http, isApiErrorWithStatus } from '@/shared/api/http';
import { saveSession } from '@/shared/auth/session';

/**
 * Asks the API whether this deploy shows the credential form.
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

export type CredentialLogin = 'ok' | 'invalid' | 'closed';

/**
 * Enters with email and password. `closed` means this deploy uses INNLAB.
 * `invalid` is a rejected credential and must stay on the form: a 401 would
 * be treated as a dead session and send the browser to the Hub.
 */
export async function enterWithCredentials(
  email: string,
  password: string,
): Promise<CredentialLogin> {
  try {
    const { data } = await http.post<unknown>('/auth/bypass', { email, password });
    saveSession(coreSessionSchema.parse(data));
    return 'ok';
  } catch (error) {
    if (isApiErrorWithStatus(error, 404)) return 'closed';
    if (isApiErrorWithStatus(error, 400) || isApiErrorWithStatus(error, 422)) {
      return 'invalid';
    }
    throw error;
  }
}
