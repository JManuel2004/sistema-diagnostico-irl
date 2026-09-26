import {
  layerTraceResponseSchema,
  recommendationResponseSchema,
  type LayerTraceResponse,
  type RecommendationResponse,
} from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getRecommendation(diagnosticId: string): Promise<RecommendationResponse> {
  return getParsed(`/diagnostics/${diagnosticId}/recommendation`, recommendationResponseSchema);
}

export function getRecommendationTrace(diagnosticId: string): Promise<LayerTraceResponse> {
  return getParsed(`/diagnostics/${diagnosticId}/recommendation/trace`, layerTraceResponseSchema);
}
