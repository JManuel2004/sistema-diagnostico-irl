import { useEffect } from 'react';
import { clearSession, getAccessToken, redirectToSso } from '@/shared/auth/session';
import { isSessionAlive } from '../api/core-auth.api';

/**
 * Keeps the session alive by passive polling.
 *
 * INNLAB issues no refresh token, so there is nothing to renew: the only
 * possibility is detecting that the session died and redoing the SSO. The
 * check runs when the tab comes back to the foreground — which is when the
 * user may have been away long enough for it to expire — and avoids
 * polling a background tab in a loop.
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
