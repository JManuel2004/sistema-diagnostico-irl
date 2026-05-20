import type { QuestionnaireStructure } from '@innlab/contracts';
import { selectAnswers, useQuestionnaireDraftStore } from '../store/questionnaire-draft.store';

/**
 * `QuestionnaireProgress` — banda superior con el progreso global del
 * cuestionario y el indicador de guardado automático.
 *
 * Adoptado del prototipo cliente: la información agregada
 * (`X / 48 afirmaciones`, `% completado`, barra) vive arriba para que
 * el avance no quede oculto dentro de cada dimensión, y el chip
 * "Guardado automático" recuerda visualmente la promesa de HU-09
 * (las respuestas se conservan en sesión sin acción del usuario).
 *
 * El componente es presentacional: deriva todo del store y no muta
 * estado.
 */
interface Props {
  dimensions: QuestionnaireStructure['dimensions'];
}

export function QuestionnaireProgress({ dimensions }: Props) {
  const answers = useQuestionnaireDraftStore(selectAnswers);

  const total = dimensions.reduce((acc, d) => acc + d.statements.length, 0);
  const answered = dimensions.reduce(
    (acc, d) => acc + d.statements.filter((s) => answers[s.id] !== undefined).length,
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
            <span className="text-muted-foreground"> / {total} afirmaciones</span>
          </p>
        </div>

        <div className="flex items-center gap-4">
          <p className="text-muted-foreground text-xs tabular-nums" aria-live="polite">
            {pct}% completado
          </p>
          <span
            className="text-muted-foreground inline-flex items-center gap-2 text-xs"
            title="Tus respuestas se guardan en tu sesión actual"
          >
            <span
              aria-hidden="true"
              className="bg-acceptable inline-block h-1.5 w-1.5 rounded-full"
            />
            Guardado automático
          </span>
        </div>
      </div>

      <div
        role="progressbar"
        aria-valuenow={pct}
        aria-valuemin={0}
        aria-valuemax={100}
        aria-label={`${answered} de ${total} afirmaciones respondidas`}
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
