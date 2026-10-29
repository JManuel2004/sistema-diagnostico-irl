import { coreSessionSchema } from '@innlab/contracts';
import { http, isApiErrorWithStatus } from '@/shared/api/http';
import { saveSession } from '@/shared/auth/session';

export interface AuthParticipant {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly companyName: string | null;
}

export interface AuthMode {
  readonly bypass: boolean;
  readonly participants: readonly AuthParticipant[];
}

const CLOSED: AuthMode = { bypass: false, participants: [] };

/**
 * Asks the API whether this deploy offers the five test people.
 *
 * A failure means "use the real login". The flag is read at runtime, so
 * changing `AUTH_BYPASS` on the API does not require a new frontend build.
 */
export async function fetchAuthMode(): Promise<AuthMode> {
  try {
    const { data } = await http.get<unknown>('/auth/mode');
    if (typeof data !== 'object' || data === null || !('bypass' in data)) {
      return CLOSED;
    }
    if (data.bypass !== true) return CLOSED;

    const raw = 'participants' in data ? data.participants : [];
    const participants = Array.isArray(raw)
      ? raw.filter(isParticipant)
      : [];
    return { bypass: true, participants };
  } catch {
    return CLOSED;
  }
}

/** Enters as one of the test people. Returns false when the real login must continue. */
export async function enterAsParticipant(userId: string): Promise<boolean> {
  try {
    const { data } = await http.post<unknown>('/auth/bypass', { userId });
    saveSession(coreSessionSchema.parse(data));
    return true;
  } catch (error) {
    if (isApiErrorWithStatus(error, 404)) return false;
    throw error;
  }
}

function isParticipant(value: unknown): value is AuthParticipant {
  if (typeof value !== 'object' || value === null) return false;
  const person = value as Record<string, unknown>;
  return (
    typeof person.id === 'string' &&
    typeof person.firstName === 'string' &&
    typeof person.lastName === 'string' &&
    typeof person.email === 'string' &&
    (person.companyName === null || typeof person.companyName === 'string')
  );
}
