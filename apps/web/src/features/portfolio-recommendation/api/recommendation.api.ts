import {
  recomendacionResponseSchema,
  trazaCapasResponseSchema,
  type RecomendacionResponse,
  type TrazaCapasResponse,
} from '@innlab/contracts';
import { http, isMissingHttpRoute } from '@/shared/api/http';
import { fetchMaturityProfile } from '@/shared/api/fetch-maturity-profile';
import {
  buildOfflineRecommendation,
  buildOfflineRecommendationTrace,
} from '@/shared/api/offline-recommendation';

export async function generateRecommendation(
  diagnosticId: string,
): Promise<RecomendacionResponse> {
  try {
    const { data } = await http.post<unknown>(
      `/diagnosticos/${diagnosticId}/recomendacion`,
    );
    return recomendacionResponseSchema.parse(data);
  } catch (error) {
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    const profile = await fetchMaturityProfile(diagnosticId);
    return buildOfflineRecommendation(profile);
  }
}

export async function getRecommendation(
  diagnosticId: string,
): Promise<RecomendacionResponse> {
  try {
    const { data } = await http.get<unknown>(
      `/diagnosticos/${diagnosticId}/recomendacion`,
    );
    return recomendacionResponseSchema.parse(data);
  } catch (error) {
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    const profile = await fetchMaturityProfile(diagnosticId);
    return buildOfflineRecommendation(profile);
  }
}

export async function getRecommendationTrace(
  diagnosticId: string,
): Promise<TrazaCapasResponse> {
  try {
    const { data } = await http.get<unknown>(
      `/diagnosticos/${diagnosticId}/recomendacion/traza`,
    );
    return trazaCapasResponseSchema.parse(data);
  } catch (error) {
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    const profile = await fetchMaturityProfile(diagnosticId);
    return buildOfflineRecommendationTrace(profile);
  }
}
