import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/shared/ui/card';
import { LoadingState } from '@/shared/ui/loading-state';
import { useMyDiagnostics } from '@/shared/hooks/useDiagnostics';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';
import { wizardPath } from './wizard/wizard-steps';

/**
 * `/panel` — el panel de la iniciativa.
 *
 * Es el destino del descriptor institucional en las pantallas con navegación.
 * Muestra la iniciativa del último diagnóstico con resultados y los accesos a
 * corregirla y a ver esos resultados. Si el usuario dejó un diagnóstico a
 * medias, ofrece continuarlo en el asistente. El historial de diagnósticos
 * pasados tiene su espacio reservado pero no se construye aquí: es una historia
 * de usuario futura.
 */
export default function DashboardPage(): JSX.Element {
  const diagnostics = useMyDiagnostics();
  // La lista viene del más reciente al más antiguo.
  const list = diagnostics.data ?? [];
  const completed = list.find((d) => d.completed);
  const inProgress = list.find((d) => !d.completed);
  const initiative = useInitiative(completed?.id);
  const start = useStartDiagnostic();

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<LogoutButton />}>
      <PageHeader
        overline="Panel de iniciativa"
        title="Tu iniciativa"
        description="El perfil que registraste y el punto en que va tu diagnóstico."
      />

      <div className="flex flex-col gap-8">
        {diagnostics.isPending && <LoadingState label="Cargando tu panel…" />}

        {diagnostics.isError && (
          <Alert tone="critical" title="No fue posible cargar tu panel">
            Intenta de nuevo en unos minutos.
          </Alert>
        )}

        {diagnostics.data && list.length === 0 && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-foreground text-lg font-semibold">
                Aún no tienes un diagnóstico
              </h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                Inicia uno para registrar tu iniciativa y responder el cuestionario IRL.
              </p>
              <Button
                className="mt-4"
                onClick={() => {
                  start.mutate();
                }}
                disabled={start.isPending}
              >
                {start.isPending ? 'Preparando tu diagnóstico…' : 'Iniciar diagnóstico'}
              </Button>
              {start.isError && (
                <Alert
                  tone="critical"
                  className="mt-4"
                  title="No fue posible iniciar el diagnóstico"
                >
                  Intenta de nuevo en unos minutos.
                </Alert>
              )}
            </CardContent>
          </Card>
        )}

        {inProgress && (
          <Card>
            <CardContent className="p-6">
              <h2 className="text-foreground text-lg font-semibold">
                Tienes un diagnóstico en curso
              </h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-sm leading-relaxed">
                Retómalo donde lo dejaste: el asistente te lleva al paso que falta.
              </p>
              <Link
                to={wizardPath(inProgress.id)}
                className={`${buttonVariants()} mt-4`}
              >
                Continuar diagnóstico
              </Link>
            </CardContent>
          </Card>
        )}

        {completed && initiative.isPending && <LoadingState label="Cargando tu iniciativa…" />}

        {completed && initiative.isError && (
          <Alert tone="critical" title="No fue posible cargar tu iniciativa">
            Intenta de nuevo en unos minutos.
          </Alert>
        )}

        {completed && initiative.data === null && (
          <Alert tone="info" title="Este diagnóstico no tiene una iniciativa registrada" />
        )}

        {completed && initiative.data && (
          <>
            <InitiativeSummary initiative={initiative.data} />
            <nav aria-label="Accesos del diagnóstico" className="flex flex-wrap gap-3">
              <Link
                to={`/diagnosticos/${completed.id}/iniciativa`}
                className={buttonVariants({ variant: 'secondary' })}
              >
                Editar iniciativa
              </Link>
              <Link to={`/diagnosticos/${completed.id}/resultados`} className={buttonVariants()}>
                Ver resultados
              </Link>
            </nav>
          </>
        )}

        {/* Reservado: el historial de diagnósticos pasados es una historia de usuario futura. */}
        <Card className="border-dashed">
          <CardHeader>
            <CardTitle>Historial de diagnósticos</CardTitle>
            <CardDescription>Próximamente: aquí verás tus diagnósticos anteriores.</CardDescription>
          </CardHeader>
        </Card>
      </div>
    </PageShell>
  );
}
