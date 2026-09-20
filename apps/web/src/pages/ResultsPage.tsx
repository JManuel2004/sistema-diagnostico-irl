import { useState, type JSX } from 'react';
import { Navigate, useParams } from 'react-router-dom';
import { LogoutButton } from '@features/auth';
import {
  ImbalanceInsights,
  ProfileContext,
  ProfileOverview,
  useMaturityProfile,
  useRadarHighlight,
} from '@features/maturity-profile';
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
import { AcceptDeepAnalysisCard } from '@/shared/ui/accept-deep-analysis-card';
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
  const accepted = diagnostic.data?.deepAnalysisAccepted === true;

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
      <PageHeader
        overline="Resultados del diagnóstico"
        title="Tu perfil de madurez IRL"
        description="Así está tu iniciativa hoy en cada dimensión del marco."
      >
        {profile.data && <ResultMeta savedAt={profile.data.computedAt} />}
      </PageHeader>

      {profile.isPending && <LoadingState label="Cargando perfil…" />}

      {profile.isError && (
        <Alert tone="critical" title="No fue posible obtener tu perfil de madurez">
          {profile.error instanceof ApiError && profile.error.status === 409
            ? 'Este diagnóstico aún no tiene un perfil de madurez calculado. Completa primero el cuestionario.'
            : profile.error.message}
        </Alert>
      )}

      {profile.data && (
        <div className="flex flex-col gap-10">
          <ProfileContext dimensionResults={profile.data.dimensionResults} />

          <ProfileOverview profile={profile.data} highlight={highlight} showImbalances={accepted} />

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
                  description="El análisis profundo suma a este perfil los desequilibrios entre dimensiones, las alertas de estado crítico, el roadmap de escalamiento y la recomendación de portafolio de INNLAB."
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

function acceptErrorMessage(error: Error | null): string {
  return error instanceof ApiError && error.status === 409
    ? 'Este diagnóstico aún no puede pasar al análisis profundo: falta su perfil de madurez.'
    : 'No fue posible aceptar el análisis profundo. Intenta de nuevo en unos minutos o contacta al equipo de INNLAB.';
}

interface DeepAnalysisProps {
  readonly diagnosticId: string;
  readonly profile: NonNullable<ReturnType<typeof useMaturityProfile>['data']>;
  readonly highlight: ReturnType<typeof useRadarHighlight>;
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

  return (
    <div className="flex flex-col gap-12">
      <section aria-labelledby="deep-imbalances">
        <SectionHeader
          id="deep-imbalances"
          overline="Análisis profundo"
          title="Desequilibrios y alertas"
          description="Dónde tu iniciativa avanza de forma despareja y qué dimensiones clave necesitan atención primero."
        />
        <ImbalanceInsights profile={profile} onHighlight={highlight.setHovered} />
      </section>

      <section aria-labelledby="deep-roadmap">
        <SectionHeader
          id="deep-roadmap"
          title="Roadmap de escalamiento"
          description="Las dimensiones por debajo del nivel esperado, ordenadas según qué habilita qué: cada fase reúne lo que puede avanzarse a la vez, y espera a que lo anterior esté resuelto."
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

      <section aria-labelledby="deep-recommendation">
        <SectionHeader
          id="deep-recommendation"
          title="Recomendación de portafolio"
          description="A partir de tu perfil de madurez, el sistema identifica cuál de los servicios de INNLAB corresponde mejor al estado actual de la iniciativa, con el criterio de enrutamiento vigente."
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
            <RecommendationSummary recommendation={recommendation.data} />
            <LayerTracePanel trace={trace.data} isLoading={trace.isFetching} onOpen={onTraceOpen} />
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
      <AcceptDeepAnalysisCard onAccept={onRetry} failed />
    </>
  );
}
