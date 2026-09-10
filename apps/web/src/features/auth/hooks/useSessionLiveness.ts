import { useEffect } from 'react';
import { clearSession, getAccessToken, redirectToSso } from '@/shared/auth/session';
import { isSessionAlive } from '../api/core-auth.api';

/**
 * Mantiene viva la sesión por sondeo pasivo.
 *
 * INNLAB no emite refresh token, así que no hay nada que renovar: lo único
 * posible es detectar que la sesión murió y rehacer el SSO. La comprobación
 * se hace cuando la pestaña vuelve a primer plano — que es cuando el
 * usuario puede haber estado fuera el tiempo suficiente como para que
 * expirara, y evita sondear en bucle una pestaña de fondo.
 */
export function useSessionLiveness(): void {
  useEffect(() => {
    let checking = false;

    async function checkOnFocus(): Promise<void> {
      if (document.visibilityState !== 'visible' || checking) return;

      const accessToken = getAccessToken();
      if (accessToken === null) return;

      checking = true;
      try {
        if (!(await isSessionAlive(accessToken))) {
          clearSession();
          redirectToSso(window.location.pathname + window.location.search);
        }
      } finally {
        checking = false;
      }
    }

    const handler = (): void => {
      void checkOnFocus();
    };

    document.addEventListener('visibilitychange', handler);
    window.addEventListener('focus', handler);

    return () => {
      document.removeEventListener('visibilitychange', handler);
      window.removeEventListener('focus', handler);
    };
  }, []);
}
