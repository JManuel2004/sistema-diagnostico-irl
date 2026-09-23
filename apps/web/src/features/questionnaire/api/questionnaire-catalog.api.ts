import { questionnaireStructureSchema, type QuestionnaireStructure } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getQuestionnaireStructure(): Promise<QuestionnaireStructure> {
  return getParsed('/catalog/questionnaire', questionnaireStructureSchema);
}
