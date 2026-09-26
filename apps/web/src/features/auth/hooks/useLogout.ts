import { useCallback, useState } from 'react';
import { clearSession, getAccessToken, redirectToSso } from '@/shared/auth/session';
import { logoutFromCore } from '../api/core-auth.api';

export interface LogoutController {
  readonly logout: () => void;
  readonly isLoggingOut: boolean;
}

/**
 * Logs out of Core and clears the local session.
 *
 * The local state is cleared even if the call to Core fails: keeping the
 * tokens in `localStorage` because the network failed would keep the user
 * inside an application they already considered closed. Cognito's global
 * logout would be lost in that case, but the local token no longer exists.
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
