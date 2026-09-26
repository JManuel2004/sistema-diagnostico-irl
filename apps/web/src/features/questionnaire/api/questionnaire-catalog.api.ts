import { questionnaireStructureSchema, type QuestionnaireStructure } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getQuestionnaireStructure(frameworkVersion: string): Promise<QuestionnaireStructure> {
  return getParsed(
    `/catalog/questionnaire?version=${encodeURIComponent(frameworkVersion)}`,
    questionnaireStructureSchema,
  );
}
