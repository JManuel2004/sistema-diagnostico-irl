import type { JSX } from 'react';
import type { LikertValue } from '@innlab/contracts';
import { Button } from '@/shared/ui/button';
import {
  selectFill,
  useQuestionnaireDraftStore,
} from '@/features/questionnaire/store/questionnaire-draft.store';
import { AGROCONECTA_ANSWERS } from './agroconecta-case';
import type { QuestionnaireAutofillProps } from './dev-autofill';

/**
 * Development only: fills the whole questionnaire with the AgroConecta case
 * (48 answers with their justifications). Each answer is matched to its
 * statement by dimension code and sequence, so it does not depend on ids.
 */
export default function QuestionnaireAutofill({
  dimensions,
}: QuestionnaireAutofillProps): JSX.Element {
  const fill = useQuestionnaireDraftStore(selectFill);

  function handleFill(): void {
    const answers: Record<string, LikertValue> = {};
    const justifications: Record<string, string> = {};
    for (const item of AGROCONECTA_ANSWERS) {
      const statement = dimensions
        .find((d) => d.code === item.dimension)
        ?.statements.find((s) => s.sequence === item.sequence);
      if (!statement) continue;
      answers[statement.id] = item.score;
      justifications[statement.id] = item.justification;
    }
    fill(answers, justifications);
  }

  return (
    <Button variant="ghost" size="sm" onClick={handleFill} data-testid="dev-autofill-questionnaire">
      Autocompletar con AgroConecta (solo desarrollo)
    </Button>
  );
}
