import { useEffect, type JSX } from 'react';
import { useParams } from 'react-router-dom';
import { QuestionnaireView } from '@features/questionnaire';
import {
  selectInitialize,
  useQuestionnaireDraftStore,
} from '@features/questionnaire/store/questionnaire-draft.store';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Shell de la página `/diagnosticos/:id/cuestionario` (HU-07 / HU-09).
 *
 * - Contenedor `reading` (`max-w-3xl`, ~768px) — fuerza ~60 caracteres
 *   por línea para los 48 enunciados (DESIGN.md).
 * - Header con descriptor institucional INNLAB; footer con la
 *   atribución KTH (RNF-09).
 * - `initialize(diagnosticId)` ata el borrador al id que viene en la
 *   URL. Al cambiar `:id` (p. ej. al abrir otro diagnóstico en la
 *   misma pestaña) el store se limpia automáticamente; al volver al
 *   mismo `:id` el borrador se conserva (AC-5 / AC-6 de SPEC-STORY3).
 */
export default function QuestionnairePage(): JSX.Element {
  // TODO(DIAGIRL-32): el id deja de ser opcional cuando aterrice la HU que
  // crea el diagnóstico — la ruta `/diagnosticos/:id/cuestionario` ya
  // garantiza el parámetro, pero en Stage 2 puede llegar undefined si la
  // página se navega directo sin pasar por el flujo de creación.
  const { id: diagnosticId } = useParams<{ id: string }>();
  const initialize = useQuestionnaireDraftStore(selectInitialize);

  useEffect(() => {
    initialize(diagnosticId ?? null);
  }, [diagnosticId, initialize]);

  return (
    <PageShell width="reading" showAttribution>
      <div className="mb-8">
        <p className="text-overline text-azul-icesi">
          Cuestionario IRL · KTH Innovation Readiness Level
        </p>
        <h1 className="tracking-tightest text-foreground mt-2 text-[2.25rem] font-bold leading-tight">
          Cuestionario IRL
        </h1>
        <p className="text-muted-foreground mt-3 max-w-prose text-base leading-relaxed">
          Responde 8 afirmaciones por dimensión con la escala Likert de 1 a 5. Sé lo más objetivo
          posible; la honestidad en las respuestas garantiza un diagnóstico más preciso y útil.
        </p>
      </div>

      <QuestionnaireView />
    </PageShell>
  );
}
