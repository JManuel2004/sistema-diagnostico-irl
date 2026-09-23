import { useMutation, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { invalidateDiagnostic } from '@/shared/api/invalidate-diagnostic';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { getConsent, recordConsent } from '../api/consent.api';
import { CONSENT_TERMS_VERSION } from '../lib/consent-terms';

/** `null` while the diagnostic has no accepted consent. */
export function useConsent(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.consent, getConsent, {
    staleTime: STALE_TIME.diagnosticInput,
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
    mutationFn: () => recordConsent(diagnosticId ?? '', CONSENT_TERMS_VERSION),
    onSuccess: async (record) => {
      if (!diagnosticId) return;
      queryClient.setQueryData(queryKeys.diagnostic.consent(diagnosticId), record);
      await invalidateDiagnostic(queryClient, diagnosticId);
    },
  });
}
