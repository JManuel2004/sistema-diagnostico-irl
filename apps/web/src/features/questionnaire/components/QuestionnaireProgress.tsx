import type { ReactNode } from 'react';
import type { QuestionnaireStructure } from '@innlab/contracts';
import {
  isStatementComplete,
  selectAnswers,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';

/**
 * `QuestionnaireProgress` — band with the questionnaire's overall progress.
 *
 * The aggregate (`X / 48 afirmaciones completas`, `% completado`, bar; a
 * statement is complete with its Likert answer; the justification is optional)
 * lives at the top so progress is not hidden inside each dimension. It sticks
 * under the header while the user scrolls, with what the wizard puts in it:
 * whether the answers are saved (`DraftSaveStatus`, usability test P02) and,
 * with everything answered, the way back to the summary (P03).
 *
 * The component is presentational: it derives everything from the store
 * and mutates no state.
 */
interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
  /** Next to the count: whether the answers are saved. */
  status?: ReactNode;
  /** At the right end: an action, e.g. back to the summary. */
  action?: ReactNode;
}

export function QuestionnaireProgress({ dimensions, status, action }: Props) {
  const answers = useQuestionnaireDraftStore(selectAnswers);

  const total = dimensions.reduce((acc, d) => acc + d.statements.length, 0);
  const answered = dimensions.reduce(
    (acc, d) => acc + d.statements.filter((s) => isStatementComplete(answers, s.id)).length,
    0,
  );
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <section
      aria-label="Progreso del cuestionario"
      className="border-border bg-background/95 supports-[backdrop-filter]:bg-background/90 sticky top-16 z-10 mb-6 border px-4 py-3 shadow-[0_6px_16px_-10px_rgba(43,43,61,0.18)] backdrop-blur sm:px-5 md:top-[4.75rem]"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-2">
        <div className="flex flex-wrap items-center gap-x-5 gap-y-1">
          <p className="text-foreground text-[0.9375rem] font-bold">
            {answered}
            <span className="text-muted-foreground font-medium">
              {' '}
              / {total} afirmaciones completas
            </span>
            <span className="text-muted-foreground ml-3 text-sm font-normal tabular-nums">
              {pct}% completado
            </span>
          </p>
          {status}
        </div>
        {action}
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${answered} de ${total} afirmaciones completas`}
        className="bg-border mt-2.5 h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-primary h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
