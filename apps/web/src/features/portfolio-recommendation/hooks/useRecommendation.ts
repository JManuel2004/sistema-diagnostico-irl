import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { acceptDeepAnalysis } from '@/shared/api/diagnostic.api';
import { getRecommendation, getRecommendationTrace } from '../api/recommendation.api';

/**
 * The recommendation is an immutable snapshot once generated, like the
 * maturity profile, so it shares its 5-minute `staleTime`.
 */
export function useRecommendation(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.recommendation(diagnosticId)
      : ['diagnostic', 'recommendation', 'idle'],
    queryFn: () => getRecommendation(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * The trace is requested separately and only when someone expands it: its
 * audience is the INNLAB team, not the initiative leader, and it is much
 * heavier than the recommendation.
 */
export function useRecommendationTrace(
  diagnosticId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.recommendationTrace(diagnosticId)
      : ['diagnostic', 'recommendation-trace', 'idle'],
    queryFn: () => getRecommendationTrace(diagnosticId!),
    enabled: Boolean(diagnosticId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * It does not trigger the recommendation calculation directly: it accepts
 * the deep analysis in `diagnosis/`, which publishes
 * `DeepAnalysisRequestedEvent` and lets `routing/` (and `roadmap/`)
 * calculate on their own. When it finishes, the result is already
 * persisted, so it only has to be read again.
 *
 * `onSuccess` returns the invalidation's promise so the mutation stays
 * `pending` until the re-read finishes: the page never sees a gap between
 * "accepted" and "recommendation available".
 */
export function useAcceptDeepAnalysis(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptDeepAnalysis(diagnosticId!),
    onSuccess: async () => {
      if (!diagnosticId) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.recommendation(diagnosticId),
        }),
        // The trace and the roadmap are recalculated with the analysis;
        // invalidating them avoids showing the result of a previous evaluation.
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.recommendationTrace(diagnosticId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.roadmap(diagnosticId),
        }),
        // The results page decides what to show from `deepAnalysisAccepted`,
        // which changes on acceptance.
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.detail(diagnosticId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
    },
  });
}
