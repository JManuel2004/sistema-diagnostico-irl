import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getScalingRoadmap } from '../api/scaling-roadmap.api';

/**
 * The roadmap is a saved result of the deep analysis, as stable a snapshot
 * as the maturity profile, so it shares its 5-minute `staleTime`.
 */
export function useScalingRoadmap(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.roadmap(diagnosticId)
      : ['diagnostic', 'roadmap', 'idle'],
    queryFn: () => getScalingRoadmap(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 5 * 60 * 1000,
  });
}
