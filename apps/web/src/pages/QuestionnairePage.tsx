import type { JSX } from 'react';
import { QuestionnaireView } from '@features/questionnaire';

/**
 * Shell de la página `/diagnosticos/:id/cuestionario` (HU-07).
 *
 * Renderiza la estructura del cuestionario IRL: 6 dimensiones × 8
 * afirmaciones en tabs navegables. El estado de respuestas (Story 2)
 * y la lógica de envío (Story 3) se añaden en etapas posteriores.
 */
export default function QuestionnairePage(): JSX.Element {
  return (
    <main className="mx-auto my-12 max-w-4xl px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cuestionario IRL</h1>
      <div className="mt-6">
        <QuestionnaireView />
      </div>
    </main>
  );
}
