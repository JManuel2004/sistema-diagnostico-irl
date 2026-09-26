import { roadmapResponseSchema, type RoadmapResponse } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getScalingRoadmap(diagnosticId: string): Promise<RoadmapResponse> {
  return getParsed(`/diagnostics/${diagnosticId}/roadmap`, roadmapResponseSchema);
}
