import { useEffect, useRef, useState } from 'react';
import { consumeReturnTo, saveSession } from '@/shared/auth/session';
import { exchangeSsoCode } from '../api/core-auth.api';

export type SsoExchangeStatus = 'exchanging' | 'done' | 'error';

export interface SsoExchangeResult {
  readonly status: SsoExchangeStatus;
  readonly error: string | null;
  /** The user's original route, available when `status === 'done'`. */
  readonly returnTo: string;
}

/**
 * Exchanges the `?code=` of the URL for the session and persists it.
 *
 * The code is single use: the guard `ref` is mandatory, not an
 * optimization. Without it, StrictMode's double effect mount in
 * development would fire two exchanges and the second would fail against an
 * already consumed code, breaking the login only locally.
 *
 * It does not retry automatically. With a 30-second TTL, a retry almost
 * always arrives late and turns one readable error into two; the right
 * recovery is redoing the whole flow from the Hub.
 */
export function useSsoExchange(code: string | null): SsoExchangeResult {
  // Arriving without a code is already the final state: it is derived on
  // the first render instead of inside the effect, because a synchronous
  // setState in an effect causes a cascading render.
  const missingCode = code === null || code === '';

  const [status, setStatus] = useState<SsoExchangeStatus>(
    missingCode ? 'error' : 'exchanging',
  );
  const [error, setError] = useState<string | null>(
    missingCode ? 'No se recibió el código de autenticación de INNLAB.' : null,
  );
  const [returnTo, setReturnTo] = useState<string>('/');
  const alreadyExchanged = useRef(false);

  useEffect(() => {
    if (missingCode || code === null || alreadyExchanged.current) return;
    alreadyExchanged.current = true;

    // No cancellation flag on purpose. The single-use guard already
    // guarantees one request: if its result were also discarded in the
    // effect cleanup, StrictMode (mount → clean up → remount) would mark the
    // ONLY request in flight as cancelled and the screen would stay on
    // "Conectando..." forever, both on failure and on success.
    // A setState after unmount is harmless since React 18.
    exchangeSsoCode(code)
      .then((session) => {
        saveSession(session);
        setReturnTo(consumeReturnTo() ?? '/');
        setStatus('done');
      })
      .catch((cause: unknown) => {
        setStatus('error');
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo completar el inicio de sesión.',
        );
      });
  }, [code, missingCode]);

  return { status, error, returnTo };
}
