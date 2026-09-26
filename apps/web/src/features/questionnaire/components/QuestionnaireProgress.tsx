import type { QuestionnaireStructure } from '@innlab/contracts';
import {
  isStatementComplete,
  selectAnswers,
  selectJustifications,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';

/**
 * `QuestionnaireProgress` — top band with the questionnaire's overall
 * progress and the draft indicator.
 *
 * The aggregate (`X / 48 afirmaciones completas`, `% completado`, bar; a
 * statement is complete with its Likert answer and its justification)
 * lives at the top so progress is not hidden inside each dimension. The
 * chip says what really happens to the draft (HU-09): it is kept in this
 * tab (`sessionStorage`) and does not reach the server until «Procesar
 * diagnóstico»; it promises no saving across sessions or tabs.
 *
 * On mobile the draft notice is hidden: its `title` stays in the DOM, and
 * the bar and the percentage are enough in a 358px row.
 *
 * The component is presentational: it derives everything from the store
 * and mutates no state.
 */
interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
}

export function QuestionnaireProgress({ dimensions }: Props) {
  const answers = useQuestionnaireDraftStore(selectAnswers);
  const justifications = useQuestionnaireDraftStore(selectJustifications);

  const total = dimensions.reduce((acc, d) => acc + d.statements.length, 0);
  const answered = dimensions.reduce(
    (acc, d) =>
      acc + d.statements.filter((s) => isStatementComplete(answers, justifications, s.id)).length,
    0,
  );
  const pct = total === 0 ? 0 : Math.round((answered / total) * 100);

  return (
    <section
      aria-label="Progreso del cuestionario"
      className="border-border bg-background mb-6 border px-4 py-3 sm:px-5"
    >
      <div className="flex flex-wrap items-center justify-between gap-x-4 gap-y-1">
        <p className="text-foreground text-[0.9375rem] font-bold">
          {answered}
          <span className="text-muted-foreground font-medium">
            {' '}
            / {total} afirmaciones completas
          </span>
        </p>

        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-sm tabular-nums" aria-live="polite">
            {pct}% completado
          </p>
          <span
            className="text-muted-foreground hidden items-center gap-2 text-sm sm:inline-flex"
            title="Tu borrador se conserva mientras no cierres esta pestaña. Se envía al procesar el diagnóstico."
          >
            <span
              aria-hidden="true"
              className="bg-dimension-brl inline-block size-2 rounded-full"
            />
            Borrador guardado en esta pestaña
          </span>
        </div>
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
