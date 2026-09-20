import type { QuestionnaireStructure } from '@innlab/contracts';
import {
  isStatementComplete,
  selectAnswers,
  selectJustifications,
  useQuestionnaireDraftStore,
} from '../store/questionnaire-draft.store';

/**
 * `QuestionnaireProgress` — banda superior con el progreso global del
 * cuestionario y el indicador de guardado automático.
 *
 * Adoptado del prototipo cliente: la información agregada
 * (`X / 48 afirmaciones completas`, `% completado`, barra; una afirmación está
 * completa con su respuesta Likert y su justificación) vive arriba para que
 * el avance no quede oculto dentro de cada dimensión. El chip dice lo que
 * realmente ocurre con el borrador (HU-09): se conserva en esta pestaña
 * (`sessionStorage`) y no llega al servidor hasta «Procesar diagnóstico»;
 * no promete guardado entre sesiones ni entre pestañas (backlog 10.2).
 *
 * El componente es presentacional: deriva todo del store y no muta
 * estado.
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
      className="border-border bg-surface-muted mb-6 rounded-md border p-4"
    >
      <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex flex-wrap items-baseline gap-3">
          <p className="text-overline text-azul-icesi">Progreso</p>
          <p className="text-foreground text-sm font-medium">
            {answered}
            <span className="text-muted-foreground"> / {total} afirmaciones completas</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
            {pct}% completado
          </p>
          <span
            className="text-muted-foreground inline-flex items-center gap-2 text-xs"
            title="Tu borrador se conserva mientras no cierres esta pestaña. Se envía al procesar el diagnóstico."
          >
            <span
              aria-hidden="true"
              className="bg-acceptable inline-block h-1.5 w-1.5 rounded-full"
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
        className="bg-border/60 mt-3 h-1.5 w-full overflow-hidden rounded-full"
      >
        <div
          className="bg-azul-icesi h-full rounded-full transition-[width] duration-300 ease-out"
          style={{ width: `${pct}%` }}
        />
      </div>
    </section>
  );
}
