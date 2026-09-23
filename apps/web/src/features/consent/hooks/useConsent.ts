import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getConsent, recordConsent } from '../api/consent.api';
import { CONSENT_TERMS_VERSION } from '../lib/consent-terms';

/** `null` while the diagnostic has no accepted consent. */
export function useConsent(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId ? queryKeys.diagnostic.consent(diagnosticId) : ['diagnostic', 'consent', 'idle'],
    queryFn: () => getConsent(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 60 * 1000,
  });
}

/**
 * Accepts the current text. The consent is stored in the cache as soon as
 * the backend answers: if the next step fails and the user retries, the
 * wizard already knows they accepted and does not ask again. It also moves
 * the diagnostic's state (through a backend event), so it is invalidated.
 */
export function useRecordConsent(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recordConsent(diagnosticId!, CONSENT_TERMS_VERSION),
    onSuccess: async (record) => {
      if (!diagnosticId) return;
      queryClient.setQueryData(queryKeys.diagnostic.consent(diagnosticId), record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
    },
  });
}
