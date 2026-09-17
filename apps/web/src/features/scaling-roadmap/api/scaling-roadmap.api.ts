import { roadmapResponseSchema, type RoadmapResponse } from '@innlab/contracts';
import { http } from '@/shared/api/http';

export async function getScalingRoadmap(
  diagnosticId: string,
): Promise<RoadmapResponse> {
  const { data } = await http.get<unknown>(
    `/diagnostics/${diagnosticId}/roadmap`,
  );
  return roadmapResponseSchema.parse(data);
}
