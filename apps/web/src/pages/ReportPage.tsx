import { useMemo, type JSX } from 'react';
import {
  ArrowLeft,
  BookOpen,
  Compass,
  Layers,
  Lightbulb,
  ListChecks,
  Route,
  Scale,
  type LucideIcon,
} from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import type { DiagnosticReport, DimensionCode } from '@innlab/contracts';
import { UserMenu } from '@features/auth';
import {
  DownloadReportButton,
  REPORT_NOT_AVAILABLE,
  ReportAnswers,
  ReportAttributionSection,
  ReportInitiativeSection,
  ReportProfileSection,
  ReportSection,
  useDiagnosticReport,
} from '@features/report';
import { ImbalanceInsights, ProfileOverview, useRadarHighlight } from '@features/maturity-profile';
import { RecommendationSummary } from '@features/portfolio-recommendation';
import { RoadmapPhaseList } from '@features/scaling-roadmap';
import { useQuestionnaireStructure } from '@features/questionnaire';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { buttonVariants } from '@/shared/ui/button';
import { isApiErrorWithCode } from '@/shared/api/http';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
import { useActiveSection } from '@/shared/hooks/useActiveSection';
import { formatDateTime } from '@/shared/lib/format';
import { paths } from '@/shared/lib/paths';
import { RETRY_LATER } from '@/shared/lib/copy';

/**
 * `/diagnosticos/:id/reporte` — the full report of a diagnostic (RF-16 /
 * HU-23), to review before downloading it as a PDF (HU-24).
 *
 * It exists only once the deep analysis is complete: the page asks the
 * diagnostic first (`deepAnalysisCompleted`, derived by the backend) and
 * requests the report only then. A diagnostic without it is told so, with
 * the way back to its results; a 409 from the backend says the same.
 *
 * It is as interactive as the results: the page composes, from the report's
 * single response, the radar and its highlight, the imbalanced pairs and
 * alerts, the service card and the route by phases that the results show,
 * plus what only the report has — the initiative, the meaning of each level,
 * the 48 answers and the attribution. A sticky bar reaches each section.
 *
 * «Descargar reporte (PDF)» is the page's primary action and appears only
 * with the report loaded: without the deep analysis complete there is no
 * download option anywhere.
 */
export default function ReportPage(): JSX.Element {
  const { id: diagnosticId } = useParams<{ id: string }>();
  const diagnostic = useDiagnostic(diagnosticId);
  const available = diagnostic.data?.deepAnalysisCompleted === true;
  const report = useDiagnosticReport(diagnosticId, available);

  if (!diagnosticId) {
    return <Navigate to={paths.panel} replace />;
  }

  const notAvailable =
    (diagnostic.data !== undefined && !available) ||
    isApiErrorWithCode(report.error, 'REPORT_NOT_AVAILABLE');

  return (
    <PageShell width="standard" showAttribution showNavigation headerActions={<UserMenu />}>
      <Link
        to={paths.results(diagnosticId)}
        className={buttonVariants({ variant: 'link', size: 'sm' })}
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Volver a los resultados
      </Link>

      <PageHeader
        overline="Reporte completo del diagnóstico"
        title={report.data?.initiative.name ?? 'Reporte completo'}
        description="Todo lo que generó el análisis profundo en un solo lugar. Revísalo antes de descargarlo."
      >
        {report.data && (
          <>
            <p className="text-muted-foreground mt-3 text-sm">
              Análisis profundo completado el {formatDateTime(report.data.completedAt)}
            </p>
            <div className="mt-6">
              <DownloadReportButton diagnosticId={diagnosticId} />
            </div>
          </>
        )}
      </PageHeader>

      {(diagnostic.isPending || (available && report.isPending)) && (
        <LoadingState label="Cargando reporte…" />
      )}

      {diagnostic.isError && (
        <Alert tone="critical" title="No fue posible abrir este diagnóstico">
          {RETRY_LATER}
        </Alert>
      )}

      {notAvailable && (
        <Alert tone="info" title={REPORT_NOT_AVAILABLE}>
          Desde los resultados puedes adquirir el análisis profundo o esperar a que termine.
        </Alert>
      )}

      {report.isError && !notAvailable && (
        <Alert tone="critical" title="No fue posible obtener el reporte completo">
          {RETRY_LATER}
        </Alert>
      )}

      {report.data && <FullReport report={report.data} />}
    </PageShell>
  );
}

const SECTIONS: readonly { id: string; label: string; icon: LucideIcon }[] = [
  { id: 'report-initiative', label: 'Iniciativa', icon: Lightbulb },
  { id: 'report-profile', label: 'Perfil', icon: Layers },
  { id: 'report-alerts', label: 'Desequilibrios y alertas', icon: Scale },
  { id: 'report-recommendation', label: 'Servicio INNLAB', icon: Compass },
  { id: 'report-roadmap', label: 'Roadmap', icon: Route },
  { id: 'report-answers', label: 'Respuestas', icon: ListChecks },
  { id: 'report-attribution', label: 'Marco', icon: BookOpen },
];

const SECTION_IDS = SECTIONS.map((s) => s.id);

function FullReport({ report }: { readonly report: DiagnosticReport }): JSX.Element {
  const highlight = useRadarHighlight();
  const catalog = useQuestionnaireStructure(report.frameworkVersion);
  const subject = report.initiative.name;
  const profile = report.profile;

  // What each dimension measures, for the radar tooltips and the alerts.
  const descriptions = useMemo(
    () =>
      Object.fromEntries(
        (catalog.data?.dimensions ?? []).map((d) => [d.code, d.description]),
      ) as Partial<Record<DimensionCode, string>>,
    [catalog.data],
  );
  const dimensionNames = Object.fromEntries(
    profile.dimensionResults.map((r) => [r.dimensionCode, r.shortName]),
  );
  // Where each dimension's work starts in the route, so the alerts can say
  // what to do next (the same reading as the results page).
  const plan: Record<string, { targetLevel: number; phase: number }> = {};
  for (const phase of report.roadmap.phases) {
    for (const d of phase.dimensions) {
      plan[d.dimensionCode] ??= { targetLevel: d.finalTargetLevel, phase: phase.order };
    }
  }

  return (
    <div className="flex flex-col gap-14 sm:gap-20">
      <ReportSectionNav />

      <ReportInitiativeSection report={report} />

      <ReportProfileSection report={report}>
        <ProfileOverview
          profile={profile}
          highlight={highlight}
          showImbalances
          descriptions={descriptions}
        />
      </ReportProfileSection>

      <ReportSection
        id="report-alerts"
        icon={Scale}
        title="Brechas, alertas y desequilibrios"
        description={`Dónde ${subject} avanza de forma despareja y qué dimensiones clave necesitan atención primero.`}
      >
        <ImbalanceInsights
          profile={profile}
          onHighlight={highlight.setHovered}
          descriptions={descriptions}
          plan={plan}
          subject={subject}
        />
      </ReportSection>

      <ReportSection
        id="report-recommendation"
        icon={Compass}
        title="Recomendación del portafolio INNLAB"
        description="El servicio de INNLAB que mejor corresponde al estado actual de la iniciativa, y por qué."
      >
        <RecommendationSummary recommendation={report.recommendation} subject={subject} />
      </ReportSection>

      <ReportSection
        id="report-roadmap"
        icon={Route}
        title="Roadmap de escalamiento"
        description="Las fases en que conviene trabajar las dimensiones y el servicio de INNLAB que podría acompañar cada una, de lo más liviano a lo más profundo."
      >
        <RoadmapPhaseList
          roadmap={report.roadmap}
          profile={profile}
          levelScale={profile.levelScale}
          dimensionNames={dimensionNames}
          subject={subject}
        />
      </ReportSection>

      <ReportSection
        id="report-answers"
        icon={ListChecks}
        title="Respuestas al cuestionario"
        description="Lo que respondiste a cada afirmación, de 1 (totalmente en desacuerdo) a 5 (totalmente de acuerdo), con tu justificación cuando la diste."
      >
        <ReportAnswers
          answers={report.answers}
          dimensions={profile.dimensionResults.map((r) => ({
            code: r.dimensionCode,
            shortName: r.shortName,
            averageLikert: r.averageLikert,
          }))}
        />
      </ReportSection>

      <ReportAttributionSection report={report} />
    </div>
  );
}

/** A sticky bar to each section, marking the one being read, like the results'. */
function ReportSectionNav(): JSX.Element {
  const active = useActiveSection(SECTION_IDS);

  return (
    <nav
      aria-label="Secciones del reporte"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky top-16 z-10 -mx-4 -mb-6 overflow-x-auto border-y px-4 shadow-[0_6px_16px_-10px_rgba(43,43,61,0.18)] backdrop-blur sm:-mx-8 sm:-mb-10 sm:px-8 md:top-[4.75rem]"
    >
      <ul className="flex min-w-max gap-6">
        {SECTIONS.map((section) => (
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
