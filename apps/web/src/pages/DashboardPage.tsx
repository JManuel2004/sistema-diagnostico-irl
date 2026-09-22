import type { JSX } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
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
 *
 * Jerarquía: un solo botón naranja por pantalla. Con un diagnóstico en curso
 * lo es «Continuar diagnóstico» y «Ver resultados» baja a secundario; sin él,
 * «Ver resultados» es la acción principal.
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
          <Card className="rounded-2xl">
            <CardContent className="p-5 sm:p-8">
              <h2 className="text-foreground text-xl font-bold">Aún no tienes un diagnóstico</h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
                Inicia uno para registrar tu iniciativa y responder el cuestionario IRL.
              </p>
              <Button
                size="lg"
                className="mt-5 w-full sm:w-auto"
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
          <section
            aria-labelledby="dashboard-in-progress"
            className="bg-azul-wash flex flex-col gap-5 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8"
          >
            <div>
              <h2
                id="dashboard-in-progress"
                className="text-foreground text-xl font-bold sm:text-[1.375rem]"
              >
                Tienes un diagnóstico en curso
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-prose text-base leading-relaxed">
                Retómalo donde lo dejaste: el asistente te lleva al paso que falta.
              </p>
            </div>
            <Link
              to={wizardPath(inProgress.id)}
              className={`${buttonVariants({ size: 'lg' })} w-full shrink-0 sm:w-auto`}
            >
              Continuar diagnóstico
              <ArrowRight className="size-5" aria-hidden="true" />
            </Link>
          </section>
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
            {/* Un solo botón naranja por pantalla: si hay un diagnóstico en curso, lo es «Continuar». */}
            <nav
              aria-label="Accesos del diagnóstico"
              className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:gap-3"
            >
              <Link
                to={`/diagnosticos/${completed.id}/iniciativa`}
                className={`${buttonVariants({ variant: 'ghost' })} w-full sm:w-auto`}
              >
                Editar iniciativa
              </Link>
              <Link
                to={`/diagnosticos/${completed.id}/resultados`}
                className={`${buttonVariants({ variant: inProgress ? 'secondary' : 'default' })} w-full sm:order-first sm:w-auto`}
              >
                Ver resultados
              </Link>
            </nav>
          </>
        )}

        {/* Reservado: el historial de diagnósticos pasados es una historia de usuario futura.
            Va como nota discreta, sin tarjeta, para no competir con lo que sí funciona. */}
        <section aria-labelledby="dashboard-history" className="border-border border-t pt-6">
          <h2 id="dashboard-history" className="text-foreground text-base font-bold">
            Historial de diagnósticos
          </h2>
          <p className="text-muted-foreground mt-1 text-sm">
            Próximamente: aquí verás tus diagnósticos anteriores.
          </p>
        </section>
      </div>
    </PageShell>
  );
}
