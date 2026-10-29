import { coreSessionSchema } from '@innlab/contracts';
import { http, isApiErrorWithStatus } from '@/shared/api/http';
import { saveSession } from '@/shared/auth/session';

/** One card on the simulated sign-in screen. */
export interface SimulatedUser {
  readonly id: string;
  readonly firstName: string;
  readonly lastName: string;
  readonly email: string;
  readonly companyName: string | null;
}

/**
 * Asks the API for the simulated cards.
 *
 * `null` means "use the real login". The flag is read at runtime, so
 * changing `AUTH_BYPASS` on the API does not require a new frontend build.
 */
export async function fetchSimulatedSignIn(): Promise<readonly SimulatedUser[] | null> {
  try {
    const { data } = await http.get<unknown>('/auth/mode');
    if (typeof data !== 'object' || data === null || !('bypass' in data)) {
      return null;
    }
    if (data.bypass !== true) return null;
    return readCards('participants' in data ? data.participants : []);
  } catch {
    return null;
  }
}

export type SimulatedEntry = 'ok' | 'invalid' | 'closed';

/**
 * Opens the session of the card that was pressed. `closed` means this
 * deploy uses INNLAB. `invalid` stays on the cards: a 401 would be treated
 * as a dead session and send the browser to the Hub.
 */
export async function enterAsSimulatedUser(userId: string): Promise<SimulatedEntry> {
  try {
    const { data } = await http.post<unknown>('/auth/bypass', { userId });
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

function readCards(value: unknown): SimulatedUser[] {
  if (!Array.isArray(value)) return [];
  const cards: SimulatedUser[] = [];
  for (const item of value) {
    if (typeof item !== 'object' || item === null) continue;
    const row = item as Record<string, unknown>;
    if (
      typeof row.id !== 'string' ||
      typeof row.firstName !== 'string' ||
      typeof row.lastName !== 'string' ||
      typeof row.email !== 'string'
    ) {
      continue;
    }
    cards.push({
      id: row.id,
      firstName: row.firstName,
      lastName: row.lastName,
      email: row.email,
      companyName: typeof row.companyName === 'string' ? row.companyName : null,
    });
  }
  return cards;
}
