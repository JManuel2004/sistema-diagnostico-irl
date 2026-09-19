import {
  recommendationResponseSchema,
  layerTraceResponseSchema,
  type RecommendationResponse,
  type LayerTraceResponse,
} from '@innlab/contracts';
import { http } from '@/shared/api/http';

export async function getRecommendation(
  diagnosticId: string,
): Promise<RecommendationResponse> {
  const { data } = await http.get<unknown>(
    `/diagnostics/${diagnosticId}/recommendation`,
  );
  return recommendationResponseSchema.parse(data);
}

export async function getRecommendationTrace(
  diagnosticId: string,
): Promise<LayerTraceResponse> {
  const { data } = await http.get<unknown>(
    `/diagnostics/${diagnosticId}/recommendation/trace`,
  );
  return layerTraceResponseSchema.parse(data);
}
