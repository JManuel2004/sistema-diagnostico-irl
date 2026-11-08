import { useState, type JSX } from 'react';
import { ArrowRight, Gauge } from 'lucide-react';
import { Link } from 'react-router-dom';
import type { DiagnosticSummary } from '@innlab/contracts';
import { UserContextGate, UserMenu, useCurrentUser } from '@features/auth';
import { InitiativeSummary, useInitiative } from '@features/initiative';
import { useSavedDraftProgress } from '@features/questionnaire';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { Badge } from '@/shared/ui/badge';
import { Button, buttonVariants } from '@/shared/ui/button';
import { LoadingState } from '@/shared/ui/loading-state';
import { notify } from '@/shared/ui/notify';
import { InProgressChoice } from '@/shared/ui/in-progress-choice';
import { isApiErrorWithCode } from '@/shared/api/http';
import { useInProgressDiagnostic, useMyDiagnostics } from '@/shared/hooks/useDiagnostics';
import { useStartDiagnostic } from '@/shared/hooks/useStartDiagnostic';
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';
import { formatDate, formatOneDecimal } from '@/shared/lib/format';
import { maturityBand } from '@/shared/lib/maturity-scale';

/**
 * `/panel` — where the user lands after signing in (DIAGIRL-26).
 *
 * Its first block is always what to do now, so it is seen without
 * scrolling (usability tests P01, P02, P05):
 *
 *  - **A diagnostic in progress, from any session.** Its answers are saved
 *    on the server while the user answers, so «Continuar diagnóstico en
 *    curso» appears whenever there is an unfinished one, on any device. Next
 *    to it, «Iniciar uno nuevo», and one line with what happens to the one in
 *    progress: starting over discards it with its answers, and a modal asks
 *    first (`InProgressChoice`).
 *  - **Without one in progress**, «Iniciar un nuevo diagnóstico», saying that
 *    the earlier ones are kept and that a diagnostic can be about another
 *    initiative.
 *  - Without any diagnostic, starting one is the only action.
 *
 * Below, compact so the list fits on one screen: **«Tus diagnósticos»**,
 * every completed diagnostic, most recent first, each named by its
 * initiative, the day its profile was computed and its global level; and
 * **the initiative of the latest one**, with the links to correct it and to
 * see its results.
 *
 * It greets the user by their first name, from the INNLAB profile; while
 * the profile has not arrived (or Core does not answer) the title is the
 * neutral «Tu iniciativa».
 *
 * Hierarchy: a single primary button per screen — «Continuar diagnóstico en
 * curso» with one in progress, else the one that starts a diagnostic.
 */
export default function DashboardPage(): JSX.Element {
  const diagnostics = useMyDiagnostics();
  // Only completed diagnostics come, most recent first.
  const completed = diagnostics.data ?? [];
  const latest = completed.at(0);
  const initiative = useInitiative(latest?.id);
  const start = useStartDiagnostic();
  const firstName = useCurrentUser().data?.user.firstName.trim();

  // The unfinished diagnostic, read from the server: offered on any device.
  const inProgressQuery = useInProgressDiagnostic();
  const inProgress = inProgressQuery.data ?? undefined;
  const answered = useSavedDraftProgress(inProgress?.id);
  const [confirmingNew, setConfirmingNew] = useState(false);

  const startNew = (discardInProgress = false): void => {
    start.mutate(
      { discardInProgress },
      {
        onError: (error) => {
          // The panel did not know about it (another device): ask instead.
          if (isApiErrorWithCode(error, 'DIAGNOSIS_IN_PROGRESS')) {
            void inProgressQuery.refetch();
            setConfirmingNew(true);
            return;
          }
          notify.error(`No fue posible iniciar el diagnóstico. ${RETRY_LATER}`);
        },
      },
    );
  };
  const requestNew = (): void => {
    if (inProgress) setConfirmingNew(true);
    else startNew();
  };
  const startLabel = start.isPending ? 'Preparando tu diagnóstico…' : 'Iniciar diagnóstico';

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      <PageHeader
        overline="Panel de iniciativa"
        title={firstName ? `Hola, ${firstName}` : 'Tu iniciativa'}
        description="Aquí inicias un diagnóstico o consultas los que ya hiciste."
      />

      <div className="flex flex-col gap-8">
        {(diagnostics.isPending || inProgressQuery.isPending) && (
          <LoadingState label="Cargando tu panel…" />
        )}

        {(diagnostics.isError || inProgressQuery.isError) && (
          <Alert tone="critical" title="No fue posible cargar tu panel">
            {RETRY_LATER}
          </Alert>
        )}

        {inProgress && (
          <section
            aria-labelledby="dashboard-in-progress"
            className="bg-azul-wash flex flex-col gap-4 rounded-2xl p-5 sm:p-6"
          >
            <div>
              <h2
                id="dashboard-in-progress"
                className="text-foreground text-xl font-bold sm:text-[1.375rem]"
              >
                Tienes un diagnóstico en curso
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-prose text-base leading-relaxed">
                {answered === undefined
                  ? 'Retómalo donde lo dejaste: tus respuestas se guardan automáticamente.'
                  : `Retómalo donde lo dejaste: llevas ${String(answered)} de 48 afirmaciones respondidas y se guardan automáticamente.`}
              </p>
            </div>
            <div className="flex flex-col gap-2 sm:flex-row sm:flex-wrap sm:gap-3">
              <Link
                to={paths.wizard(inProgress.id)}
                className={`${buttonVariants({ size: 'lg' })} w-full sm:w-auto`}
              >
                Continuar diagnóstico en curso
                <ArrowRight className="size-5" aria-hidden="true" />
              </Link>
              <UserContextGate>
                <Button
                  size="lg"
                  variant="secondary"
                  className="w-full sm:w-auto"
                  onClick={requestNew}
                  disabled={start.isPending}
                >
                  {start.isPending ? startLabel : 'Iniciar uno nuevo'}
                </Button>
              </UserContextGate>
            </div>
            <p className="text-muted-foreground max-w-prose text-sm leading-relaxed">
              Si inicias uno nuevo, el diagnóstico en curso y sus respuestas se descartan. Antes de
              hacerlo te lo preguntamos.
            </p>
          </section>
        )}

        {diagnostics.data && inProgressQuery.isSuccess && !inProgress && (
          <section
            aria-labelledby="dashboard-new"
            className="bg-azul-wash flex flex-col gap-4 rounded-2xl p-5 sm:flex-row sm:items-center sm:justify-between sm:gap-8 sm:p-6"
          >
            <div>
              <h2
                id="dashboard-new"
                className="text-foreground text-xl font-bold sm:text-[1.375rem]"
              >
                {completed.length === 0 ? 'Aún no tienes un diagnóstico' : 'Haz un nuevo diagnóstico'}
              </h2>
              <p className="text-muted-foreground mt-1.5 max-w-prose text-base leading-relaxed">
                {completed.length === 0
                  ? 'Inicia uno para registrar tu iniciativa y responder el cuestionario IRL. Puedes registrar más de una iniciativa: cada diagnóstico es sobre la que elijas.'
                  : 'Empieza desde el comienzo y los anteriores se conservan. Puede ser sobre la misma iniciativa o sobre otra: puedes registrar más de una.'}
              </p>
            </div>
            {/* A diagnostic belongs to whoever starts it: without the user's context it is not offered. */}
            <UserContextGate>
              <Button
                size="lg"
                className="w-full shrink-0 sm:w-auto"
                onClick={() => {
                  startNew();
                }}
                disabled={start.isPending}
              >
                {start.isPending
                  ? startLabel
                  : completed.length === 0
                    ? 'Iniciar diagnóstico'
                    : 'Iniciar un nuevo diagnóstico'}
              </Button>
            </UserContextGate>
          </section>
        )}

        {completed.length > 0 && (
          <section aria-labelledby="dashboard-history" className="flex flex-col gap-2">
            <h2 id="dashboard-history" className="text-foreground text-xl font-bold">
              Tus diagnósticos
            </h2>
            <p className="text-muted-foreground max-w-prose text-base leading-relaxed">
              Abre uno para ver sus resultados sin responder de nuevo. «Con análisis profundo» incluye
              además el servicio recomendado y la ruta de escalamiento.
            </p>
            <ul className="border-border flex flex-col border-t">
              {completed.map((d) => (
                <DiagnosticRow key={d.id} diagnostic={d} />
              ))}
            </ul>
          </section>
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
          <section aria-labelledby="dashboard-latest" className="flex flex-col gap-3">
            <h2 id="dashboard-latest" className="text-foreground text-xl font-bold">
              Tu última iniciativa
            </h2>
            <InitiativeSummary initiative={initiative.data} compact />
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
                className={`${buttonVariants({ variant: 'secondary' })} w-full sm:order-first sm:w-auto`}
              >
                Ver resultados de la última iniciativa
              </Link>
            </nav>
          </section>
        )}

        {inProgress && (
          <InProgressChoice
            open={confirmingNew}
            continueTo={paths.wizard(inProgress.id)}
            answered={answered}
            discarding={start.isPending}
            onDiscard={() => {
              startNew(true);
            }}
            onCancel={() => {
              setConfirmingNew(false);
            }}
          />
        )}
      </div>
    </PageShell>
  );
}

/** One completed diagnostic: its initiative, when, its level and how far it went. */
function DiagnosticRow({ diagnostic }: { readonly diagnostic: DiagnosticSummary }): JSX.Element {
  const name = diagnostic.initiativeName ?? 'Iniciativa sin nombre';
  const when = diagnostic.profileComputedAt ?? diagnostic.createdAt;
  const band = diagnostic.globalAverage === null ? null : maturityBand(diagnostic.globalAverage);
  return (
    <li className="border-border flex flex-col gap-2 border-b py-3 sm:flex-row sm:items-center sm:justify-between">
      <div className="flex min-w-0 flex-col gap-1.5">
        <p className="text-foreground text-base font-bold">{name}</p>
        <p className="text-muted-foreground flex flex-wrap items-center gap-x-4 gap-y-1 text-base">
          <span>Perfil del {formatDate(when)}</span>
          {diagnostic.globalAverage !== null && band && (
            <span className="text-foreground inline-flex items-center gap-1.5 font-semibold">
              <Gauge className={`${band.textInk} size-4`} aria-hidden="true" />
              Nivel IRL global{' '}
              <span className={`${band.textInk} font-extrabold`}>
                {formatOneDecimal(diagnostic.globalAverage)}
              </span>
              <span className={`${band.textInk} text-sm font-semibold`}>({band.label})</span>
            </span>
          )}
          {diagnostic.deepAnalysisAccepted ? (
            <Badge tone="acceptable">Con análisis profundo</Badge>
          ) : (
            <Badge>Solo perfil de madurez</Badge>
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
