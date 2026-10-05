import type { JSX } from 'react';
import { Download, LoaderCircle } from 'lucide-react';
import { Button } from '@/shared/ui/button';
import { notify } from '@/shared/ui/notify';
import { isApiErrorWithStatus } from '@/shared/api/http';
import { RETRY_LATER_OR_CONTACT } from '@/shared/lib/copy';
import { useDownloadReport } from '../hooks/useDownloadReport';

/** Said when the backend answers that the report does not exist yet. */
export const REPORT_NOT_AVAILABLE =
  'El reporte completo solo está disponible después de completar el análisis profundo.';

/**
 * «Descargar reporte (PDF)» — the primary action of the report page
 * (HU-24). The page renders it only once the report has loaded, so it never
 * appears for a diagnostic without the deep analysis complete; if the
 * backend still answers 409, the user is told why.
 */
interface Props {
  readonly diagnosticId: string;
}

export function DownloadReportButton({ diagnosticId }: Props): JSX.Element {
  const download = useDownloadReport(diagnosticId);

  return (
    <Button
      size="lg"
      disabled={download.isPending}
      onClick={() => {
        download.mutate(undefined, {
          onSuccess: () => {
            notify.success('Reporte descargado.');
          },
          onError: (error) => {
            notify.error(
              isApiErrorWithStatus(error, 409)
                ? REPORT_NOT_AVAILABLE
                : `No fue posible descargar el reporte. ${RETRY_LATER_OR_CONTACT}`,
            );
          },
        });
      }}
    >
      {download.isPending ? (
        <LoaderCircle className="size-5 motion-safe:animate-spin" aria-hidden="true" />
      ) : (
        <Download className="size-5" aria-hidden="true" />
      )}
      {download.isPending ? 'Preparando el PDF…' : 'Descargar reporte (PDF)'}
    </Button>
  );
}
