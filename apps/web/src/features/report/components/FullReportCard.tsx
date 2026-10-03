import type { JSX } from 'react';
import { Link } from 'react-router-dom';
import { ArrowRight, FileText } from 'lucide-react';
import { buttonVariants } from '@/shared/ui/button';
import { paths } from '@/shared/lib/paths';
import { FALLBACK_SUBJECT } from '@/shared/lib/copy';

/**
 * The way from the results to the full report. The results page renders it
 * only when the deep analysis is complete: before that there is no report
 * and nothing offers one.
 *
 * A link with the shape of a secondary button: the screen's single primary
 * action is elsewhere.
 */
interface Props {
  readonly diagnosticId: string;
  readonly subject?: string;
}

export function FullReportCard({ diagnosticId, subject }: Props): JSX.Element {
  return (
    <section
      aria-labelledby="full-report"
      className="border-border flex flex-col gap-5 border p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6"
    >
      <div className="flex gap-4">
        <span
          aria-hidden="true"
          className="bg-azul-icesi text-primary-foreground flex size-10 shrink-0 items-center justify-center rounded-full sm:size-12"
        >
          <FileText className="size-5 sm:size-6" />
        </span>
        <div>
          <h2 id="full-report" className="text-h3 text-foreground">
            El reporte completo
          </h2>
          <p className="text-muted-foreground mt-1 max-w-prose text-base">
            Todo lo que generó el análisis profundo de {subject ?? FALLBACK_SUBJECT} en un solo
            documento, para revisarlo antes de conservarlo o compartirlo.
          </p>
        </div>
      </div>
      <Link
        to={paths.report(diagnosticId)}
        className={buttonVariants({ variant: 'secondary', size: 'default' })}
      >
        Ver reporte completo
        <ArrowRight className="size-4" aria-hidden="true" />
      </Link>
    </section>
  );
}
