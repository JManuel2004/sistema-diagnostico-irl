import { useCallback, useState } from 'react';
import { clearSession, getAccessToken, redirectToSso } from '@/shared/auth/session';
import { logoutFromCore } from '../api/core-auth.api';

export interface LogoutController {
  readonly logout: () => void;
  readonly isLoggingOut: boolean;
}

/**
 * Cierra sesión en Core y limpia la sesión local.
 *
 * El estado local se limpia aunque la llamada a Core falle: dejar los
 * tokens en `localStorage` porque la red falló mantendría al usuario
 * dentro de una aplicación que él ya dio por cerrada. El logout global de
 * Cognito se perdería en ese caso, pero el token local ya no existe.
 */
export function useLogout(): LogoutController {
  const [isLoggingOut, setIsLoggingOut] = useState(false);

  const logout = useCallback(() => {
    setIsLoggingOut(true);
    const accessToken = getAccessToken();

    const done = (): void => {
      clearSession();
      redirectToSso();
    };

    if (accessToken === null) {
      done();
      return;
    }

    void logoutFromCore(accessToken).finally(done);
  }, []);

  return { logout, isLoggingOut };
}
