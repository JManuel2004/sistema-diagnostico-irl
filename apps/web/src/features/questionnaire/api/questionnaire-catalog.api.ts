import { questionnaireStructureSchema, type QuestionnaireStructure } from '@innlab/contracts';
import { http } from '@/shared/api/http';

export async function getQuestionnaireStructure(): Promise<QuestionnaireStructure> {
  const { data } = await http.get<unknown>('/catalogo/cuestionario');
  return questionnaireStructureSchema.parse(data);
}
