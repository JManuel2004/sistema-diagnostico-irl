import { useMemo, useState, type JSX } from 'react';
import { Compass, Layers, Route, Scale, type LucideIcon } from 'lucide-react';
import { Navigate, useParams } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import {
  ImbalanceInsights,
  ProfileContext,
  ProfileHero,
  ProfileOverview,
  useMaturityProfile,
  useRadarHighlight,
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
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { SectionHeader } from '@/shared/ui/section-header';
import { ResultMeta } from '@/shared/ui/result-meta';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import {
  AcceptDeepAnalysisCard,
  RetryDeepAnalysisCard,
} from '@/shared/ui/accept-deep-analysis-card';
import { ApiError } from '@/shared/api/http';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
import { wizardPath } from './wizard/wizard-steps';

/**
 * `/diagnosticos/:id/resultados` — los resultados de un diagnóstico en una sola
 * vista (Fase 8c).
 *
 * Antes eran tres pantallas (perfil, recomendación, roadmap) a las que se
 * llegaba por botón. Ahora hay una página y lo que muestra depende de una sola
 * cosa que el backend decide, `deepAnalysisAccepted`:
 *
 *  - **Sin análisis profundo:** el perfil de madurez (radar y las señales que
 *    se leen de él), con la invitación a aceptar el análisis. Los pares
 *    desequilibrados no se muestran ni se dibujan en el radar.
 *  - **Con análisis profundo:** además, los pares desequilibrados y las
 *    dimensiones en estado crítico, el roadmap de escalamiento y la
 *    recomendación de portafolio.
 *
 * Aceptar el análisis profundo (RF-11) es una acción del usuario: el botón
 * vive aquí y no envía nada por sí solo al entrar (backlog 4.6). La página
 * compone tres features; una feature no puede importar de otra, la página sí.
 *
 * Cada resultado es un resultado guardado con su fecha (`ResultMeta`).
 *
 * Es la primera pantalla con navegación principal: el asistente que la
 * precede no la lleva. Un diagnóstico que sigue en el asistente no tiene
 * resultados; si se llega aquí por un enlace, se le devuelve a él.
 */
export default function ResultsPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const [traceRequested, setTraceRequested] = useState(false);

  const diagnostic = useDiagnostic(diagnosticId);
  const profile = useMaturityProfile(diagnosticId);
  const initiative = useInitiative(diagnosticId);
  const catalog = useQuestionnaireStructure();
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
    return <Navigate to="/panel" replace />;
  }

  // Con datos en caché que se están revalidando (recién se procesó el
  // cuestionario) no se decide todavía: el dato viejo diría «sin terminar».
  if (diagnostic.data && !diagnostic.data.completed && !diagnostic.isFetching) {
    return <Navigate to={wizardPath(diagnosticId)} replace />;
  }

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<LogoutButton />}>
      {profile.data ? (
        <ProfileHero
          initiativeName={subject}
          description={initiative.data?.productType}
          sectorName={initiative.data?.sector.name}
          stageName={initiative.data?.stage.name}
          globalAverage={profile.data.globalAverage}
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
          {profile.error instanceof ApiError && profile.error.status === 409
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
              Intenta de nuevo en unos minutos.
            </Alert>
          )}

          {diagnostic.data && !accepted && (
            <>
              {accept.isPending ? (
                <LoadingState label="Calculando el análisis profundo…" />
              ) : (
                <AcceptDeepAnalysisCard
                  onAccept={() => {
                    accept.mutate();
                  }}
                  failed={accept.isError}
                  subject={subject}
                />
              )}
              {accept.isError && <Alert tone="critical" title={acceptErrorMessage(accept.error)} />}
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
        </div>
      )}
    </PageShell>
  );
}

/**
 * Con el análisis profundo aceptado la página crece a cuatro bloques: una
 * barra fija, bajo la cabecera, lleva a cada uno sin recorrer todo el scroll.
 */
const RESULT_SECTIONS: readonly { href: string; label: string; icon: LucideIcon }[] = [
  { href: '#perfil', label: 'Perfil', icon: Layers },
  { href: '#desequilibrios', label: 'Desequilibrios y alertas', icon: Scale },
  { href: '#roadmap', label: 'Roadmap', icon: Route },
  { href: '#servicio', label: 'Servicio INNLAB', icon: Compass },
];

function ResultSectionNav(): JSX.Element {
  return (
    <nav
      aria-label="Secciones del resultado"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky top-16 z-10 -mx-4 -mb-6 overflow-x-auto border-y px-4 shadow-[0_6px_16px_-10px_rgba(43,43,61,0.18)] backdrop-blur sm:-mx-8 sm:-mb-10 sm:px-8 md:top-[4.75rem]"
    >
      <ul className="flex min-w-max gap-6">
        {RESULT_SECTIONS.map((section) => (
          <li key={section.href}>
            <a
              href={section.href}
              className="text-muted-foreground hover:text-foreground hover:border-primary flex h-12 items-center gap-2 border-b-2 border-transparent text-[0.9375rem] font-semibold"
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
  return error instanceof ApiError && error.status === 409
    ? 'Este diagnóstico aún no puede pasar al análisis profundo: falta su perfil de madurez.'
    : 'No fue posible aceptar el análisis profundo. Intenta de nuevo en unos minutos o contacta al equipo de INNLAB.';
}

interface DeepAnalysisProps {
  readonly diagnosticId: string;
  readonly profile: NonNullable<ReturnType<typeof useMaturityProfile>['data']>;
  readonly highlight: ReturnType<typeof useRadarHighlight>;
  readonly descriptions: Partial<Record<DimensionCode, string>>;
  /** Nombre de la iniciativa; sin él las secciones hablan de «tu iniciativa». */
  readonly subject: string | undefined;
  readonly traceRequested: boolean;
  readonly onTraceOpen: () => void;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}

/**
 * El análisis profundo: desequilibrios y estado crítico (del perfil), roadmap
 * y recomendación. El roadmap y la recomendación se piden solo aquí, cuando
 * el análisis fue aceptado.
 *
 * Si el diagnóstico dice que el análisis fue aceptado pero uno de los dos
 * resultados no existe, el cálculo falló en el servidor: se avisa y se
 * ofrece reintentarlo con la misma acción.
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

  const roadmapMissing =
    roadmap.error instanceof ApiError && roadmap.error.code === 'ROADMAP_NOT_GENERATED';
  const recommendationMissing =
    recommendation.error instanceof ApiError &&
    recommendation.error.code === 'ROUTING_RECOMMENDATION_NOT_GENERATED';

  const who = subject ?? 'tu iniciativa';
  const dimensionNames = Object.fromEntries(
    profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );
  // The goal and phase of each dimension in the plan, so the alerts can say what to do next.
  const plan = Object.fromEntries(
    (roadmap.data?.phases ?? []).flatMap((phase) =>
      phase.dimensions.map((d) => [
        d.dimensionCode,
        { targetLevel: d.targetLevel, phase: phase.order },
      ]),
    ),
  );

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

      <section id="roadmap" aria-labelledby="deep-roadmap" className="scroll-mt-40">
        <SectionHeader
          id="deep-roadmap"
          overline="Roadmap de escalamiento"
          icon={Route}
          title={`El plan de escalamiento de ${who}`}
          description="Las dimensiones que todavía tienen que avanzar, ordenadas según qué habilita qué: cada fase reúne lo que puede trabajarse a la vez y espera a que la anterior esté resuelta."
        >
          {roadmap.data && <ResultMeta savedAt={roadmap.data.generatedAt} />}
        </SectionHeader>
        {roadmap.isPending && <LoadingState label="Cargando roadmap…" />}
        {roadmapMissing && (
          <MissingResult what="el roadmap" onRetry={onRetry} retrying={retrying} />
        )}
        {roadmap.isError && !roadmapMissing && (
          <Alert tone="critical" title="No fue posible construir el roadmap">
            {roadmap.error instanceof ApiError && roadmap.error.code === 'ROADMAP_GRAPH_HAS_CYCLE'
              ? 'El grafo de dependencias entre dimensiones está mal configurado. Contacta al equipo de INNLAB.'
              : 'Intenta de nuevo en unos minutos.'}
          </Alert>
        )}
        {roadmap.data && (
          <>
            <RoadmapPhaseList roadmap={roadmap.data} />
            {roadmap.data.phases.length > 0 && <RoadmapExplanationPanel roadmap={roadmap.data} />}
          </>
        )}
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
        {recommendationMissing && (
          <MissingResult what="la recomendación" onRetry={onRetry} retrying={retrying} />
        )}
        {recommendation.isError && !recommendationMissing && (
          <Alert tone="critical" title="No fue posible obtener la recomendación">
            {recommendation.error instanceof ApiError &&
            recommendation.error.code === 'ROUTING_NO_ACTIVE_CONFIGURATION'
              ? 'No hay una configuración de enrutamiento activa. Contacta al equipo de INNLAB.'
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
    </div>
  );
}

function MissingResult({
  what,
  onRetry,
  retrying,
}: {
  readonly what: string;
  readonly onRetry: () => void;
  readonly retrying: boolean;
}): JSX.Element {
  return retrying ? (
    <LoadingState label="Calculando el análisis profundo…" />
  ) : (
    <>
      <Alert
        tone="critical"
        className="mb-4"
        title={`No fue posible generar ${what}. Intenta de nuevo en unos minutos o contacta al equipo de INNLAB.`}
      />
      <RetryDeepAnalysisCard onRetry={onRetry} />
    </>
  );
}
