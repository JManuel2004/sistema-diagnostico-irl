import type { JSX } from 'react';

/**
 * Shell de la página `/diagnosticos/:id/cuestionario`.
 *
 * Stage 1 renderiza un placeholder. Stage 2 reemplaza el cuerpo con
 * `<QuestionnaireForm />` desde `features/questionnaire` — el folder
 * del feature ya existe pero no exporta nada todavía (HU-07/08/09).
 */
export default function QuestionnairePage(): JSX.Element {
  return (
    <main className="mx-auto my-12 max-w-4xl px-8">
      <h1 className="text-2xl font-semibold tracking-tight">Cuestionario IRL</h1>
      <p className="text-muted-foreground mt-4">
        El cuestionario se implementará en la etapa 2 a partir de las historias HU-07, HU-08 y
        HU-09.
      </p>
    </main>
  );
}
