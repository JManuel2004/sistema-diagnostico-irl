import { useEffect, useRef, type JSX } from 'react';
import { PageShell } from '@/shared/ui/page-shell';
import { Alert } from '@/shared/ui/alert';
import { Button } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';

/**
 * `/diagnosticos/nuevo` — el punto de entrada de «Iniciar diagnóstico».
 *
 * Es una ruta protegida: sin sesión, `ProtectedRoute` manda al Hub de INNLAB y,
 * al volver autenticado, el usuario cae aquí y **continúa solo**, sin volver a
 * pulsar el botón de la portada. Con sesión pasa de largo.
 *
 * Al abrirse pide el diagnóstico al backend, que reanuda el que el usuario
 * tenga sin terminar o crea uno, y abre el asistente. Que esa acción ocurra al
 * entrar es lo que se quiere aquí (es lo que el usuario acaba de pedir con su
 * clic), a diferencia de aceptar el análisis profundo, que nunca se dispara
 * sola (backlog 4.6). El `ref` evita el doble disparo de StrictMode en
 * desarrollo, que de otro modo pediría el diagnóstico dos veces a la vez.
 */
export default function StartDiagnosticPage(): JSX.Element {
  const start = useStartDiagnostic();
  const requested = useRef(false);

  useEffect(() => {
    if (requested.current) return;
    requested.current = true;
    start.mutate();
  }, [start]);

  return (
    <PageShell width="reading" showAttribution>
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
          Intenta de nuevo en unos minutos.
        </Alert>
      ) : (
        <LoadingState label="Preparando tu diagnóstico…" />
      )}
    </PageShell>
  );
}
