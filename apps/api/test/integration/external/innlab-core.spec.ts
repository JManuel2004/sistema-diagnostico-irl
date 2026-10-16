import { describe, expect, it } from '@jest/globals';
import { InnlabCoreHttpClient } from '../../../src/shared/identity/infrastructure/integrations/innlab-core-http.client.js';
import { NotFoundError } from '../../../src/shared/kernel/domain/errors/not-found.error.js';
import type { AppConfig } from '../../../src/config/configuration.js';

/**
 * Integration against the real INNLAB Core (its development instance).
 *
 * Every other suite fakes Core; this one checks the contract against the
 * service itself: the internal key is accepted, an unknown user answers
 * 404 and a wrong key is refused. It runs only when the instance is
 * configured and reachable, and otherwise it is skipped with a warning, so
 * CI never fails because an external service is asleep or not set up:
 *
 *   CORE_IT_BASE_URL       e.g. https://innlab-core-api.onrender.com/api
 *   CORE_IT_INTERNAL_KEY   the x-internal-key registered for this system
 *   CORE_IT_USER_ID        optional: a real user, to read their context
 *
 * Dedicated variables, not the app's `INNLAB_API_BASE_URL`: pointing the
 * tests at a real service has to be a decision.
 */
const BASE_URL = process.env.CORE_IT_BASE_URL ?? '';
const INTERNAL_KEY = process.env.CORE_IT_INTERNAL_KEY ?? '';
const KNOWN_USER = process.env.CORE_IT_USER_ID ?? '';
// A free instance may need several seconds to wake up.
const TIMEOUT_MS = 30_000;

async function reachable(): Promise<string | null> {
  if (BASE_URL === '' || INTERNAL_KEY === '') {
    return 'CORE_IT_BASE_URL and CORE_IT_INTERNAL_KEY are not set';
  }
  try {
    await fetch(BASE_URL, { signal: AbortSignal.timeout(TIMEOUT_MS) });
    return null;
  } catch (cause) {
    return `${BASE_URL} did not answer (${cause instanceof Error ? cause.message : String(cause)})`;
  }
}

const skipReason = await reachable();
if (skipReason !== null) {
  process.stderr.write(`\n[innlab-core] Skipped: ${skipReason}.\n`);
}
const describeIfCore = skipReason === null ? describe : describe.skip;

function client(internalKey = INTERNAL_KEY): InnlabCoreHttpClient {
  return new InnlabCoreHttpClient({
    innlabCore: { baseUrl: BASE_URL, timeoutMs: TIMEOUT_MS, internalKey },
  } as AppConfig);
}

describeIfCore('INNLAB Core real (instancia de desarrollo)', () => {
  it('acepta la llave interna del sistema: un usuario desconocido responde 404, no 401', async () => {
    await expect(
      client().getUserContext('00000000-0000-4000-8000-000000000000'),
    ).rejects.toBeInstanceOf(NotFoundError);
  });

  it('rechaza una llave interna equivocada', async () => {
    await expect(
      client('not-the-registered-key').getUserContext(
        '00000000-0000-4000-8000-000000000000',
      ),
    ).rejects.toThrow(/INNLAB Core respondio 40[13]/);
  });

  (KNOWN_USER === '' ? it.skip : it)(
    'devuelve el contexto de un usuario real con la forma que el sistema espera',
    async () => {
      const context = await client().getUserContext(KNOWN_USER);

      expect(context.userId).toBe(KNOWN_USER);
      expect(typeof context.email).toBe('string');
      expect(typeof context.name).toBe('string');
      expect(Array.isArray(context.companies)).toBe(true);
    },
  );
});
