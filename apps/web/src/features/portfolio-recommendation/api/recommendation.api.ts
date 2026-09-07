import {
  recomendacionResponseSchema,
  trazaCapasResponseSchema,
  type RecomendacionResponse,
  type TrazaCapasResponse,
} from '@innlab/contracts';
import { http } from '@/shared/api/http';

export async function generateRecommendation(
  diagnosticId: string,
): Promise<RecomendacionResponse> {
  const { data } = await http.post<unknown>(
    `/diagnosticos/${diagnosticId}/recomendacion`,
  );
  return recomendacionResponseSchema.parse(data);
}

export async function getRecommendation(
  diagnosticId: string,
): Promise<RecomendacionResponse> {
  const { data } = await http.get<unknown>(
    `/diagnosticos/${diagnosticId}/recomendacion`,
  );
  return recomendacionResponseSchema.parse(data);
}

export async function getRecommendationTrace(
  diagnosticId: string,
): Promise<TrazaCapasResponse> {
  const { data } = await http.get<unknown>(
    `/diagnosticos/${diagnosticId}/recomendacion/traza`,
  );
  return trazaCapasResponseSchema.parse(data);
}
