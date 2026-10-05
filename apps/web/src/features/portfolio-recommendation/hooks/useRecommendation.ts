import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { invalidateDiagnostic } from '@/shared/api/invalidate-diagnostic';
import { acceptDeepAnalysis } from '@/shared/api/diagnostic.api';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { holdForMinimum } from '@/shared/lib/hold-for-minimum';
import { getRecommendation, getRecommendationTrace } from '../api/recommendation.api';

/**
 * The recommendation is an immutable snapshot once generated, like the
 * maturity profile.
 */
export function useRecommendation(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.recommendation, getRecommendation, {
    staleTime: STALE_TIME.savedResult,
  });
}

/**
 * The trace is requested separately and only when someone expands it: its
 * audience is the INNLAB team, not the initiative leader, and it is much
 * heavier than the recommendation.
 */
export function useRecommendationTrace(diagnosticId: string | undefined, enabled: boolean) {
  return useDiagnosticQuery(
    diagnosticId,
    queryKeys.diagnostic.recommendationTrace,
    getRecommendationTrace,
    { staleTime: STALE_TIME.savedResult, enabled },
  );
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
    mutationFn: async () => {
      const startedAt = Date.now();
      const accepted = await acceptDeepAnalysis(diagnosticId ?? '');
      await holdForMinimum(startedAt);
      return accepted;
    },
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
        invalidateDiagnostic(queryClient, diagnosticId),
      ]);
    },
  });
}
