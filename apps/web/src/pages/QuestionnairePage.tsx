import type { JSX } from 'react';
import { QuestionnaireView } from '@features/questionnaire';
import { PageShell } from '@/shared/ui/page-shell';

/**
 * Shell de la página `/diagnosticos/:id/cuestionario` (HU-07).
 *
 * - Contenedor `reading` (`max-w-3xl`, ~768px) — fuerza ~60 caracteres
 *   por línea para los 48 enunciados (DESIGN.md).
 * - Header con descriptor institucional INNLAB; footer con la
 *   atribución KTH (RNF-09).
 * - El estado de respuestas (Story 2) y la lógica de envío (Story 3)
 *   se montan dentro de `QuestionnaireView`.
 */
export default function QuestionnairePage(): JSX.Element {
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
