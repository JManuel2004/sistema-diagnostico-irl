import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { getScalingRoadmap } from '../api/scaling-roadmap.api';

/**
 * The roadmap is a saved result of the deep analysis, as stable a snapshot
 * as the maturity profile.
 */
export function useScalingRoadmap(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.roadmap, getScalingRoadmap, {
    staleTime: STALE_TIME.savedResult,
  });
}
