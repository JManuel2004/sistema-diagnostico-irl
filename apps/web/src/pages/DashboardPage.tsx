import type { JSX } from 'react';
import { ArrowRight } from 'lucide-react';
import { Link } from 'react-router-dom';
import { UserContextGate, UserMenu } from '@features/auth';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { LoadingState } from '@/shared/ui/loading-state';
import { notify } from '@/shared/ui/notify';
import { useMyDiagnostics } from '@/shared/hooks/useDiagnostics';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';

/**
 * `/panel` — the initiative panel.
 *
 * It is where the institutional descriptor leads on the screens with
 * navigation. It shows the initiative of the latest diagnostic with results
 * and the links to correct it and to see those results. If the user left a
 * diagnostic halfway, it offers to continue it in the wizard. When phase 1
 * is already done and nothing is unfinished, it offers a new diagnostic:
 * the previous one stays, and the new one starts at the first step of the wizard. The history
 * of past diagnostics has its space reserved but is not built here: it is a
 * future user story.
 *
 * Hierarchy: a single primary button per screen. With a diagnostic in
 * progress it is «Continuar diagnóstico» and «Ver resultados» drops to
 * secondary; without one, «Ver resultados» is the main action and «Iniciar
 * un nuevo diagnóstico» stays secondary.
 */
export default function DashboardPage(): JSX.Element {
  const diagnostics = useMyDiagnostics();
  // The list comes most recent first.
  const list = diagnostics.data ?? [];
  const completed = list.find((d) => d.completed);
  const inProgress = list.find((d) => !d.completed);
  const initiative = useInitiative(completed?.id);
  const start = useStartDiagnostic();
  const beginDiagnostic = (): void => {
    start.mutate(undefined, {
      onError: () => {
        notify.error(`No fue posible iniciar el diagnóstico. ${RETRY_LATER}`);
      },
    });
  };

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      <PageHeader
        overline="Panel de iniciativa"
        title="Tu iniciativa"
        description="El perfil que registraste y el punto en que va tu diagnóstico."
      />

      <div className="flex flex-col gap-8">
        {diagnostics.isPending && <LoadingState label="Cargando tu panel…" />}

        {diagnostics.isError && (
          <Alert tone="critical" title="No fue posible cargar tu panel">
            {RETRY_LATER}
          </Alert>
        )}

        {diagnostics.data && list.length === 0 && (
          <Card className="rounded-2xl">
            <CardContent className="p-5 sm:p-8">
              <h2 className="text-foreground text-xl font-bold">Aún no tienes un diagnóstico</h2>
              <p className="text-muted-foreground mt-2 max-w-prose text-base leading-relaxed">
                Inicia uno para registrar tu iniciativa y responder el cuestionario IRL.
              </p>
              {/* A diagnostic belongs to whoever starts it: without the user's context it is not offered. */}
              <div className="mt-5">
                <UserContextGate>
                  <Button
                    size="lg"
                    className="w-full sm:w-auto"
                    onClick={beginDiagnostic}
                    disabled={start.isPending}
                  >
                    {start.isPending ? 'Preparando tu diagnóstico…' : 'Iniciar diagnóstico'}
                  </Button>
                </UserContextGate>
              </div>
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
              to={paths.wizard(inProgress.id)}
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
            {RETRY_LATER}
          </Alert>
        )}

        {completed && initiative.data === null && (
          <Alert tone="info" title="Este diagnóstico no tiene una iniciativa registrada" />
        )}

        {completed && initiative.data && (
          <>
            <InitiativeSummary initiative={initiative.data} />
            {/* A single primary button per screen: with a diagnostic in progress, it is «Continuar». */}
            <nav
              aria-label="Accesos del diagnóstico"
              className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:gap-3"
            >
              {/* Once the deep analysis is accepted the profile is frozen (409). */}
              {!completed.deepAnalysisAccepted && (
                <Link
                  to={paths.initiative(completed.id)}
                  className={`${buttonVariants({ variant: 'ghost' })} w-full sm:w-auto`}
                >
                  Editar iniciativa
                </Link>
              )}
              <Link
                to={paths.results(completed.id)}
                className={`${buttonVariants({ variant: inProgress ? 'secondary' : 'default' })} w-full sm:order-first sm:w-auto`}
              >
                Ver resultados
              </Link>
            </nav>
          </>
        )}

        {completed && !inProgress && (
          <section
            aria-labelledby="dashboard-new-diagnostic"
            className="border-border flex flex-col gap-5 rounded-2xl border p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-8"
          >
            <div>
              <h2
                id="dashboard-new-diagnostic"
                className="text-foreground text-xl font-bold sm:text-[1.375rem]"
              >
                Un diagnóstico nuevo
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-prose text-base leading-relaxed">
                Evalúa otra iniciativa, o una nueva versión de la misma. El anterior se conserva.
              </p>
            </div>
            <UserContextGate>
              <Button
                variant="secondary"
                size="lg"
                className="w-full shrink-0 sm:w-auto"
                onClick={beginDiagnostic}
                disabled={start.isPending}
              >
                {start.isPending ? 'Preparando tu diagnóstico…' : 'Iniciar un nuevo diagnóstico'}
              </Button>
            </UserContextGate>
          </section>
        )}

        {/*
          Reserved: the history of past diagnostics is a future user story.
          It goes as a discreet note, without a card, so it does not compete with what works.
        */}
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
