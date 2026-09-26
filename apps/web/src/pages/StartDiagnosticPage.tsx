import { useEffect, useRef, type JSX } from 'react';
import { UserContextGate, UserMenu, useCurrentUser } from '@features/auth';
import { PageShell } from '@/shared/ui/page-shell';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';
import { RETRY_LATER } from '@/shared/lib/copy';

/**
 * `/diagnosticos/nuevo` — the entry point of «Iniciar diagnóstico».
 *
 * It is a protected route: without a session, `ProtectedRoute` sends the
 * user to the INNLAB Hub and, back authenticated, they land here and
 * **continue on their own**, without pressing the landing's button again.
 * With a session it passes straight through.
 *
 * On opening it asks the backend for the diagnostic, which resumes the
 * user's unfinished one or creates one, and opens the wizard. That this
 * action happens on entry is what is wanted here (it is what the user just
 * asked for with their click), unlike accepting the deep analysis, which
 * never fires on its own. The `ref` prevents StrictMode's double firing in
 * development, which would otherwise ask for the diagnostic twice at once.
 *
 * The request waits for the user's context (`UserContextGate`, RF-01): a
 * diagnostic belongs to whoever starts it, so without knowing who that is
 * nothing is created and the page says why.
 */
export default function StartDiagnosticPage(): JSX.Element {
  const user = useCurrentUser();
  const start = useStartDiagnostic();
  const requested = useRef(false);

  useEffect(() => {
    if (!user.isSuccess || requested.current) return;
    requested.current = true;
    start.mutate();
  }, [user.isSuccess, start]);

  return (
    <PageShell width="reading" showAttribution headerActions={<UserMenu />}>
      <UserContextGate>
        {start.isError ? (
          <Alert
            tone="critical"
            title="No fue posible iniciar el diagnóstico"
            action={
              <Button
                variant="secondary"
                onClick={() => {
                  start.mutate();
                }}
              >
                Reintentar
              </Button>
            }
          >
            {RETRY_LATER}
          </Alert>
        ) : (
          <LoadingState label="Preparando tu diagnóstico…" />
        )}
      </UserContextGate>
    </PageShell>
  );
}
