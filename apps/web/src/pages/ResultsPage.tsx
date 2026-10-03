import { useMemo, useState, type JSX } from 'react';
import { Compass, Layers, Route, Scale, type LucideIcon } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { UserMenu } from '@features/auth';
import {
  ImbalanceInsights,
  ProfileContext,
  ProfileHero,
  ProfileOverview,
  useMaturityProfile,
  useRadarHighlight,
  type RadarHighlight,
} from '@features/maturity-profile';
import { useInitiative } from '@features/initiative';
import { useQuestionnaireStructure } from '@features/questionnaire';
import type { DimensionCode } from '@innlab/contracts';
import {
  LayerTracePanel,
  RecommendationSummary,
  useAcceptDeepAnalysis,
  useRecommendation,
  useRecommendationTrace,
} from '@features/portfolio-recommendation';
import {
  RoadmapExplanationPanel,
  RoadmapPhaseList,
  useScalingRoadmap,
} from '@features/scaling-roadmap';
import { FullReportCard } from '@features/report';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { SectionHeader } from '@/shared/ui/section-header';
import { ResultMeta } from '@/shared/ui/result-meta';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { ProcessingState } from '@/shared/ui/processing-state';
import { notify } from '@/shared/ui/notify';
import {
  AcceptDeepAnalysisCard,
  RetryDeepAnalysisCard,
} from '@/shared/ui/accept-deep-analysis-card';
import { isApiErrorWithCode, isApiErrorWithStatus } from '@/shared/api/http';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
import { useActiveSection } from '@/shared/hooks/useActiveSection';
import { paths } from '@/shared/lib/paths';
import { FALLBACK_SUBJECT, RETRY_LATER, RETRY_LATER_OR_CONTACT } from '@/shared/lib/copy';

/**
 * `/diagnosticos/:id/resultados` — the results of a diagnostic in a single
 * view.
 *
 * What it shows depends on one thing the backend decides,
 * `deepAnalysisAccepted`:
 *
 *  - **Without deep analysis:** the maturity profile (radar and the signals
 *    read from it), with the invitation to accept the analysis. The
 *    imbalanced pairs are neither shown nor drawn on the radar.
 *  - **With deep analysis:** also the imbalanced pairs and the dimensions
 *    in critical state, the scaling roadmap and the portfolio
 *    recommendation; once it is complete (`deepAnalysisCompleted`), the
 *    way to the full report.
 *
 * Accepting the deep analysis (RF-11) is a user action: the button lives
 * here and nothing is sent just by opening the page. The page composes
 * three features; a feature cannot import another, a page can.
 *
 * Each result is a saved result with its date (`ResultMeta`).
 *
 * It is the first screen with main navigation: the wizard before it does
 * not carry it. A diagnostic still in the wizard has no results; if one
 * arrives here through a link, it is sent back to the wizard.
 */
export default function ResultsPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const [traceRequested, setTraceRequested] = useState(false);

  const diagnostic = useDiagnostic(diagnosticId);
  const profile = useMaturityProfile(diagnosticId);
  const initiative = useInitiative(diagnosticId);
  const catalog = useQuestionnaireStructure(diagnostic.data?.frameworkVersion);
  const accepted = diagnostic.data?.deepAnalysisAccepted === true;

  // What each dimension measures, for the radar tooltips and the alerts. It comes
  // from the questionnaire catalog; without it the explanations simply omit it.
  const descriptions = useMemo(
    () =>
      Object.fromEntries(
        (catalog.data?.dimensions ?? []).map((d) => [d.code, d.description]),
      ) as Partial<Record<DimensionCode, string>>,
    [catalog.data],
  );
  const subject = initiative.data?.name;

  const highlight = useRadarHighlight();
  const accept = useAcceptDeepAnalysis(diagnosticId);

  if (!diagnosticId) {
    return <Navigate to={paths.panel} replace />;
  }

  // With cached data being revalidated (the questionnaire was just
  // processed) nothing is decided yet: the old datum would say «unfinished».
  if (diagnostic.data && !diagnostic.data.completed && !diagnostic.isFetching) {
    return <Navigate to={paths.wizard(diagnosticId)} replace />;
  }

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      {profile.data ? (
        <ProfileHero
          initiativeName={subject}
          description={initiative.data?.productType}
          sectorName={initiative.data?.sector.name}
          stageName={initiative.data?.stage.name}
          globalAverage={profile.data.globalAverage}
          globalLevel={profile.data.globalLevel}
          dimensionResults={profile.data.dimensionResults}
          strength={profile.data.strength}
          bottleneck={profile.data.bottleneck}
        >
          <ResultMeta savedAt={profile.data.computedAt} />
        </ProfileHero>
      ) : (
        <PageHeader
          overline="Resultados del diagnóstico"
          title="Resultados del diagnóstico"
          description="Aquí verás el perfil de madurez de tu iniciativa."
        />
      )}

      {profile.isPending && <LoadingState label="Cargando perfil…" />}

      {profile.isError && (
        <Alert tone="critical" title="No fue posible obtener tu perfil de madurez">
          {isApiErrorWithStatus(profile.error, 409)
            ? 'Este diagnóstico aún no tiene un perfil de madurez calculado. Completa primero el cuestionario.'
            : profile.error.message}
        </Alert>
      )}

      {profile.data && (
        <div className="mt-10 flex flex-col gap-14 sm:mt-14 sm:gap-20">
          {diagnostic.data && accepted && <ResultSectionNav />}

          <ProfileContext dimensionResults={profile.data.dimensionResults} />

          <div id="perfil" className="scroll-mt-40">
            <ProfileOverview
              profile={profile.data}
              highlight={highlight}
              showImbalances={accepted}
              descriptions={descriptions}
            />
          </div>

          {diagnostic.isError && (
            <Alert tone="critical" title="No fue posible saber si aceptaste el análisis profundo">
              {RETRY_LATER}
            </Alert>
          )}

          {diagnostic.data && !accepted && (
            <>
              {accept.isPending ? (
                <DeepAnalysisProcessing />
              ) : (
                <AcceptDeepAnalysisCard
                  onAccept={() => {
                    accept.mutate(undefined, {
                      onSuccess: () => {
                        notify.success('Análisis profundo listo.');
                      },
                      onError: (error) => {
                        notify.error(acceptErrorMessage(error));
                      },
                    });
                  }}
                  failed={accept.isError}
                  subject={subject}
                />
              )}
            </>
          )}

          {diagnostic.data && accepted && (
            <DeepAnalysis
              diagnosticId={diagnosticId}
              profile={profile.data}
              highlight={highlight}
              descriptions={descriptions}
              subject={subject}
              traceRequested={traceRequested}
              onTraceOpen={() => {
                setTraceRequested(true);
              }}
              onRetry={() => {
                accept.mutate();
              }}
              retrying={accept.isPending}
            />
          )}

          {diagnostic.data?.deepAnalysisCompleted === true && !accept.isPending && (
            <FullReportCard diagnosticId={diagnosticId} subject={subject} />
          )}
        </div>
      )}
    </PageShell>
  );
}

/**
 * With the deep analysis accepted the page grows to four blocks: a sticky
 * bar, under the header, reaches each one without scrolling through it all.
 * Like the header navigation, it marks where the reader is with a blue
 * underline, on top of `aria-current`, and follows the scroll.
 */
const RESULT_SECTIONS: readonly { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'perfil', label: 'Perfil', icon: Layers },
  { id: 'desequilibrios', label: 'Desequilibrios y alertas', icon: Scale },
  { id: 'servicio', label: 'Servicio INNLAB', icon: Compass },
  { id: 'roadmap', label: 'Roadmap', icon: Route },
];

const RESULT_SECTION_IDS = RESULT_SECTIONS.map((section) => section.id);

function ResultSectionNav(): JSX.Element {
  const active = useActiveSection(RESULT_SECTION_IDS);

  return (
    <nav
      aria-label="Secciones del resultado"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky top-16 z-10 -mx-4 -mb-6 overflow-x-auto border-y px-4 shadow-[0_6px_16px_-10px_rgba(43,43,61,0.18)] backdrop-blur sm:-mx-8 sm:-mb-10 sm:px-8 md:top-[4.75rem]"
    >
      <ul className="flex min-w-max gap-6">
        {RESULT_SECTIONS.map((section) => (
          <li key={section.id}>
            <a
              href={`#${section.id}`}
              aria-current={active === section.id ? 'location' : undefined}
              className="text-muted-foreground hover:text-foreground hover:border-primary/40 aria-[current=location]:border-primary aria-[current=location]:text-foreground flex h-12 items-center gap-2 border-b-2 border-transparent text-[0.9375rem] font-semibold aria-[current=location]:font-bold"
            >
              <section.icon className="size-4 shrink-0" aria-hidden="true" />
              {section.label}
            </a>
          </li>
        ))}
      </ul>
    </nav>
  );
}

function acceptErrorMessage(error: Error | null): string {
  return isApiErrorWithStatus(error, 409)
    ? 'Este diagnóstico aún no puede pasar al análisis profundo: falta su perfil de madurez.'
    : `No fue posible aceptar el análisis profundo. ${RETRY_LATER_OR_CONTACT}`;
}

interface DeepAnalysisProps {
  readonly diagnosticId: string;
  readonly profile: NonNullable<ReturnType<typeof useMaturityProfile>['data']>;
  readonly highlight: RadarHighlight;
  readonly descriptions: Partial<Record<DimensionCode, string>>;
  /** Name of the initiative; without it the sections talk about «tu iniciativa». */
  readonly subject: string | undefined;
  readonly traceRequested: boolean;
  readonly onTraceOpen: () => void;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}

/**
 * The deep analysis: imbalances and critical state (from the profile),
 * roadmap and recommendation. The roadmap and the recommendation are only
 * requested here, once the analysis was accepted.
 *
 * If the diagnostic says the analysis was accepted but one of the two
 * results does not exist, the calculation failed on the server: the user is
 * told and offered to retry with the same action.
 */
function DeepAnalysis({
  diagnosticId,
  profile,
  highlight,
  descriptions,
  subject,
  traceRequested,
  onTraceOpen,
  onRetry,
  retrying,
}: DeepAnalysisProps): JSX.Element {
  const roadmap = useScalingRoadmap(diagnosticId);
  const recommendation = useRecommendation(diagnosticId);
  const trace = useRecommendationTrace(diagnosticId, traceRequested);

  const roadmapMissing = isApiErrorWithCode(roadmap.error, 'ROADMAP_NOT_GENERATED');
  const recommendationMissing = isApiErrorWithCode(
    recommendation.error,
    'ROUTING_RECOMMENDATION_NOT_GENERATED',
  );

  const who = subject ?? FALLBACK_SUBJECT;
  const dimensionNames = Object.fromEntries(
    profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );
  // The final goal of each dimension in the plan and the phase where its
  // work starts, so the alerts can say what to do next. A rise may span
  // several phases: the first one it appears in is where it starts.
  const plan: Record<string, { targetLevel: number; phase: number }> = {};
  for (const phase of roadmap.data?.phases ?? []) {
    for (const d of phase.dimensions) {
      plan[d.dimensionCode] ??= { targetLevel: d.finalTargetLevel, phase: phase.order };
    }
  }

  // Retrying recalculates both results at once: one wait for the whole
  // analysis, not one per missing result.
  if (retrying) return <DeepAnalysisProcessing />;

  return (
    <div className="flex flex-col gap-16 sm:gap-24">
      <section id="desequilibrios" aria-labelledby="deep-imbalances" className="scroll-mt-40">
        <SectionHeader
          id="deep-imbalances"
          overline="Análisis profundo"
          icon={Scale}
          title="Desequilibrios y alertas"
          description={`Dónde ${who} avanza de forma despareja y qué dimensiones clave necesitan atención primero.`}
        />
        <ImbalanceInsights
          profile={profile}
          onHighlight={highlight.setHovered}
          descriptions={descriptions}
          plan={plan}
          subject={subject}
        />
      </section>

      <section id="servicio" aria-labelledby="deep-recommendation" className="scroll-mt-40">
        <SectionHeader
          id="deep-recommendation"
          overline="Portafolio INNLAB"
          icon={Compass}
          title={`El servicio de INNLAB para ${who}`}
          description="A partir del perfil de madurez, el sistema identifica cuál de los servicios de INNLAB corresponde mejor al estado actual de la iniciativa."
        >
          {recommendation.data && <ResultMeta savedAt={recommendation.data.generatedAt} />}
        </SectionHeader>
        {recommendation.isPending && <LoadingState label="Cargando recomendación…" />}
        {recommendationMissing && <MissingResult what="la recomendación" onRetry={onRetry} />}
        {recommendation.isError && !recommendationMissing && (
          <Alert tone="critical" title="No fue posible obtener la recomendación">
            {isApiErrorWithCode(recommendation.error, 'ROUTING_CONFIGURATION_MISSING')
              ? 'El motor de recomendación no tiene su configuración cargada. Contacta al equipo de INNLAB.'
              : recommendation.error.message}
          </Alert>
        )}
        {recommendation.data && (
          <>
            <RecommendationSummary recommendation={recommendation.data} subject={subject} />
            <LayerTracePanel
              trace={trace.data}
              isLoading={trace.isFetching}
              onOpen={onTraceOpen}
              dimensionNames={dimensionNames}
            />
          </>
        )}
      </section>

      <section id="roadmap" aria-labelledby="deep-roadmap" className="scroll-mt-40">
        <SectionHeader
          id="deep-roadmap"
          overline="Roadmap de escalamiento"
          icon={Route}
          title={`El plan de escalamiento de ${who}`}
          description="Las dimensiones que todavía tienen que avanzar, ordenadas según qué habilita qué, y el servicio de INNLAB que podrías contratar en cada fase: de lo más liviano a lo más profundo, hasta dejar tus dimensiones parejas."
        >
          {roadmap.data && <ResultMeta savedAt={roadmap.data.generatedAt} />}
        </SectionHeader>
        {roadmap.isPending && <LoadingState label="Cargando roadmap…" />}
        {roadmapMissing && <MissingResult what="el roadmap" onRetry={onRetry} />}
        {roadmap.isError && !roadmapMissing && (
          <Alert tone="critical" title="No fue posible construir el roadmap">
            {isApiErrorWithCode(roadmap.error, 'ROADMAP_GRAPH_HAS_CYCLE')
              ? 'El grafo de dependencias entre dimensiones está mal configurado. Contacta al equipo de INNLAB.'
              : RETRY_LATER}
          </Alert>
        )}
        {roadmap.data && (
          <>
            <RoadmapPhaseList
              roadmap={roadmap.data}
              profile={profile}
              levelScale={profile.levelScale}
              dimensionNames={dimensionNames}
              subject={subject}
            />
            {roadmap.data.phases.length > 0 && <RoadmapExplanationPanel roadmap={roadmap.data} />}
          </>
        )}
      </section>
    </div>
  );
}

/**
 * The deep analysis while it is calculated: the same steps the backend
 * runs, from the recommendation to the plan by phases.
 */
const DEEP_ANALYSIS_STEPS = [
  'Revisamos qué servicios de INNLAB no aplican a tu iniciativa',
  'Medimos la afinidad de cada servicio con tu perfil',
  'Aplicamos los criterios del centro y elegimos tu servicio',
  'Ordenamos las dimensiones según qué habilita qué',
  'Asignamos a cada fase del plan un servicio que la atienda',
] as const;

function DeepAnalysisProcessing(): JSX.Element {
  return (
    <ProcessingState
      overline="Análisis profundo"
      title="Estamos preparando tu análisis"
      description="Cruzamos tus seis dimensiones para recomendarte un servicio de INNLAB y un plan de fortalecimiento."
      steps={DEEP_ANALYSIS_STEPS}
    />
  );
}

function MissingResult({
  what,
  onRetry,
}: {
  readonly what: string;
  readonly onRetry: () => void;
}): JSX.Element {
  return (
    <>
      <Alert
        tone="critical"
        className="mb-4"
        title={`No fue posible generar ${what}. ${RETRY_LATER_OR_CONTACT}`}
      />
      <RetryDeepAnalysisCard onRetry={onRetry} />
    </>
  );
}
