import { useMutation } from '@tanstack/react-query';
import { downloadDiagnosticReport } from '../api/report.api';
import { saveFile } from '../lib/save-file';

/** The name used when the response does not suggest one. */
const FALLBACK_FILE_NAME = 'reporte-diagnostico-irl.pdf';

/**
 * Downloads the full report as a PDF and hands it to the browser to save.
 * A mutation, not a query: it is an action the user takes, and the file is
 * not kept in the cache.
 */
export function useDownloadReport(diagnosticId: string) {
  return useMutation({
    mutationFn: () => downloadDiagnosticReport(diagnosticId),
    onSuccess: ({ blob, fileName }) => {
      saveFile(blob, fileName ?? FALLBACK_FILE_NAME);
    },
  });
}
