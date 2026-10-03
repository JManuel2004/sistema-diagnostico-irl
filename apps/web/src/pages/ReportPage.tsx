import type { JSX } from 'react';
import { ArrowLeft } from 'lucide-react';
import { Link, Navigate, useParams } from 'react-router-dom';
import { UserMenu } from '@features/auth';
import {
  DownloadReportButton,
  REPORT_NOT_AVAILABLE,
  ReportDocument,
  useDiagnosticReport,
} from '@features/report';
import { PageShell } from '@/shared/ui/page-shell';
import { PageHeader } from '@/shared/ui/page-header';
import { Alert } from '@/shared/ui/alert';
import { LoadingState } from '@/shared/ui/loading-state';
import { buttonVariants } from '@/shared/ui/button';
import { isApiErrorWithCode } from '@/shared/api/http';
import { useDiagnostic } from '@/shared/hooks/useDiagnostics';
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
        description="Todo lo que generó el análisis profundo en un solo documento. Revísalo antes de descargarlo."
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

      {report.data && <ReportDocument report={report.data} />}
    </PageShell>
  );
}
