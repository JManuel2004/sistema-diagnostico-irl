import { roadmapResponseSchema, type RoadmapResponse } from '@innlab/contracts';
import { http, isMissingHttpRoute } from '@/shared/api/http';
import { fetchMaturityProfile } from '@/shared/api/fetch-maturity-profile';
import { buildOfflineRoadmap } from '@/shared/api/offline-roadmap';

export async function getScalingRoadmap(
  diagnosticId: string,
): Promise<RoadmapResponse> {
  try {
    const { data } = await http.get<unknown>(
      `/diagnosticos/${diagnosticId}/roadmap`,
    );
    return roadmapResponseSchema.parse(data);
  } catch (error) {
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    const profile = await fetchMaturityProfile(diagnosticId);
    return buildOfflineRoadmap(profile);
  }
}
