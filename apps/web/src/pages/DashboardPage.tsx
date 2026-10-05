import type { JSX } from 'react';
import { ArrowRight, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DiagnosticSummary } from '@innlab/contracts';
import { UserContextGate, UserMenu } from '@features/auth';
import {
  InitiativeSummary,
  selectDraftDiagnosticId as selectInitiativeDraftDiagnosticId,
  useInitiative,
  useInitiativeDraftStore,
} from '@features/initiative';
import {
  selectDraftDiagnosticId as selectQuestionnaireDraftDiagnosticId,
  useQuestionnaireDraftStore,
} from '@features/questionnaire';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonVariants } from '@/shared/ui/button';
import { Card, CardContent } from '@/shared/ui/card';
import { LoadingState } from '@/shared/ui/loading-state';
import { notify } from '@/shared/ui/notify';
import { useDiagnostic, useMyDiagnostics } from '@/shared/hooks/useDiagnostics';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';
import { formatDate, formatOneDecimal } from '@/shared/lib/format';

/**
 * `/panel` — where the user lands after signing in (DIAGIRL-26).
 *
 * It offers to consult a completed diagnostic or to start a new one:
 *
 *  - **The initiative of the latest completed diagnostic**, with the links to
 *    correct it and to see its results.
 *  - **«Tus diagnósticos»:** every completed diagnostic, most recent first,
 *    each named by its initiative, the day its profile was computed and its
 *    global level. Opening one shows its saved results; from there the deep
 *    analysis can be accepted if it was not.
 *  - **A diagnostic in progress only when this tab still has its draft.**
 *    The answers live in the tab (`sessionStorage`): once it was closed there
 *    is nothing to recover, so an unfinished diagnostic of an earlier session
 *    is not offered. Starting a new one deletes it in the backend.
 *  - Without any completed diagnostic, starting one is the only action.
 *
 * Hierarchy: a single primary button per screen — «Continuar diagnóstico»
 * with one in progress, else «Ver resultados» of the latest, else
 * «Iniciar diagnóstico».
 */
export default function DashboardPage(): JSX.Element {
  const diagnostics = useMyDiagnostics();
  // Only completed diagnostics come, most recent first.
  const completed = diagnostics.data ?? [];
  const latest = completed.at(0);
  const initiative = useInitiative(latest?.id);
  const start = useStartDiagnostic();

  // A diagnostic this tab is filling in: its drafts name it.
  const questionnaireOwner = useQuestionnaireDraftStore(selectQuestionnaireDraftDiagnosticId);
  const initiativeOwner = useInitiativeDraftStore(selectInitiativeDraftDiagnosticId);
  const draftOwner = questionnaireOwner ?? initiativeOwner ?? undefined;
  const drafted = useDiagnostic(draftOwner);
  const inProgress = drafted.data && !drafted.data.completed ? drafted.data : undefined;

  const startNew = (): void => {
    start.mutate(undefined, {
      onError: () => {
        notify.error(`No fue posible iniciar el diagnóstico. ${RETRY_LATER}`);
      },
    });
  };
  const startLabel = start.isPending ? 'Preparando tu diagnóstico…' : 'Iniciar diagnóstico';

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      <PageHeader
        overline="Panel de iniciativa"
        title="Tu iniciativa"
        description="Consulta tus diagnósticos anteriores o inicia uno nuevo."
      />

      <div className="flex flex-col gap-8">
        {diagnostics.isPending && <LoadingState label="Cargando tu panel…" />}

        {diagnostics.isError && (
          <Alert tone="critical" title="No fue posible cargar tu panel">
            {RETRY_LATER}
          </Alert>
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
                Retómalo donde lo dejaste: tus respuestas siguen guardadas en esta pestaña.
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

        {diagnostics.data && completed.length === 0 && !inProgress && (
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
                    onClick={startNew}
                    disabled={start.isPending}
                  >
                    {startLabel}
                  </Button>
                </UserContextGate>
              </div>
            </CardContent>
          </Card>
        )}

        {latest && initiative.isPending && <LoadingState label="Cargando tu iniciativa…" />}

        {latest && initiative.isError && (
          <Alert tone="critical" title="No fue posible cargar tu iniciativa">
            {RETRY_LATER}
          </Alert>
        )}

        {latest && initiative.data === null && (
          <Alert tone="info" title="Este diagnóstico no tiene una iniciativa registrada" />
        )}

        {latest && initiative.data && (
          <>
            <InitiativeSummary initiative={initiative.data} />
            {/* A single primary button per screen: with a diagnostic in progress, it is «Continuar». */}
            <nav
              aria-label="Accesos del diagnóstico"
              className="flex flex-col-reverse gap-2 sm:flex-row sm:flex-wrap sm:gap-3"
            >
              {/* Once the deep analysis is accepted the profile is frozen (409). */}
              {!latest.deepAnalysisAccepted && (
                <Link
                  to={paths.initiative(latest.id)}
                  className={`${buttonVariants({ variant: 'ghost' })} w-full sm:w-auto`}
                >
                  Editar iniciativa
                </Link>
              )}
              <Link
                to={paths.results(latest.id)}
                className={`${buttonVariants({ variant: inProgress ? 'secondary' : 'default' })} w-full sm:order-first sm:w-auto`}
              >
                Ver resultados
              </Link>
            </nav>
          </>
        )}

        {completed.length > 0 && (
          <section aria-labelledby="dashboard-history" className="flex flex-col gap-3">
            <h2 id="dashboard-history" className="text-foreground text-xl font-bold">
              Tus diagnósticos
            </h2>
            <p className="text-muted-foreground text-base">
              Abre uno para revisar sus resultados sin responder de nuevo el cuestionario.
            </p>
            <ul className="border-border flex flex-col border-t">
              {completed.map((d) => (
                <DiagnosticRow key={d.id} diagnostic={d} />
              ))}
            </ul>
          </section>
        )}

        {(completed.length > 0 || inProgress) && (
          <section
            aria-labelledby="dashboard-new"
            className="border-border flex flex-col gap-3 border-t pt-6 sm:flex-row sm:items-center sm:justify-between"
          >
            <div>
              <h2 id="dashboard-new" className="text-foreground text-base font-bold">
                ¿Quieres diagnosticar de nuevo?
              </h2>
              <p className="text-muted-foreground mt-1 max-w-prose text-base leading-relaxed">
                {inProgress
                  ? 'Un diagnóstico nuevo empieza desde el comienzo y descarta el que tienes en curso.'
                  : 'Un diagnóstico nuevo empieza desde el comienzo; los anteriores se conservan.'}
              </p>
            </div>
            <UserContextGate>
              <Button
                variant="secondary"
                className="w-full shrink-0 sm:w-auto"
                onClick={startNew}
                disabled={start.isPending}
              >
                {start.isPending ? startLabel : 'Iniciar un diagnóstico nuevo'}
              </Button>
            </UserContextGate>
          </section>
        )}
      </div>
    </PageShell>
  );
}

/** One completed diagnostic: its initiative, when, its level and how far it went. */
function DiagnosticRow({ diagnostic }: { readonly diagnostic: DiagnosticSummary }): JSX.Element {
  const name = diagnostic.initiativeName ?? 'Iniciativa sin nombre';
  const when = diagnostic.profileComputedAt ?? diagnostic.createdAt;
  return (
    <li className="border-border flex flex-col gap-3 border-b py-4 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-foreground text-base font-bold">{name}</p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
          <span>Perfil del {formatDate(when)}</span>
          {diagnostic.globalAverage !== null && (
            <span className="text-foreground inline-flex items-center gap-1.5 font-semibold">
              <Gauge className="text-azul-icesi size-4" aria-hidden="true" />
              Nivel IRL global {formatOneDecimal(diagnostic.globalAverage)}
            </span>
          )}
          {diagnostic.deepAnalysisAccepted ? (
            <Badge tone="acceptable">Con análisis profundo</Badge>
          ) : (
            <Badge>Perfil inicial</Badge>
          )}
        </p>
      </div>
      <Link
        to={paths.results(diagnostic.id)}
        aria-label={`Ver resultados de ${name}, perfil del ${formatDate(when)}`}
        className={`${buttonVariants({ variant: 'ghost' })} w-full shrink-0 sm:w-auto`}
      >
        Ver resultados
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </li>
  );
}
