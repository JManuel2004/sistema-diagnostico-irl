import { useEffect, useRef, useState } from 'react';
import { consumeReturnTo, saveSession } from '@/shared/auth/session';
import { exchangeSsoCode } from '../api/core-auth.api';

export type SsoExchangeStatus = 'exchanging' | 'done' | 'error';

export interface SsoExchangeResult {
  readonly status: SsoExchangeStatus;
  readonly error: string | null;
  /** Ruta original del usuario, disponible cuando `status === 'done'`. */
  readonly returnTo: string;
}

/**
 * Canjea el `?code=` de la URL por la sesión y la persiste.
 *
 * El código es de un solo uso: el `ref` de guarda es obligatorio, no una
 * optimización. Sin él, el doble montaje de efectos de StrictMode en
 * desarrollo dispararía dos canjes y el segundo fallaría contra un código
 * ya consumido, rompiendo el login solo en local.
 *
 * No reintenta automáticamente. Con un TTL de 30 segundos, un reintento
 * llega casi siempre tarde y convierte un error legible en dos; la
 * recuperación correcta es rehacer el flujo completo desde el Hub.
 */
export function useSsoExchange(code: string | null): SsoExchangeResult {
  // Llegar sin código ya es el estado final: se deriva en el primer
  // render en vez de dentro del efecto, porque un setState síncrono en
  // un efecto provoca un render en cascada.
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
    if (missingCode || alreadyExchanged.current) return;
    alreadyExchanged.current = true;

    let cancelled = false;

    exchangeSsoCode(code)
      .then((session) => {
        if (cancelled) return;
        saveSession(session);
        setReturnTo(consumeReturnTo() ?? '/');
        setStatus('done');
      })
      .catch((cause: unknown) => {
        if (cancelled) return;
        setStatus('error');
        setError(
          cause instanceof Error
            ? cause.message
            : 'No se pudo completar el inicio de sesión.',
        );
      });

    return () => {
      cancelled = true;
    };
  }, [code, missingCode]);

  return { status, error, returnTo };
}
