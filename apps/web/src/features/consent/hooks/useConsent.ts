import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { getCurrentConsentTerms, recordConsent } from '../api/consent.api';

/** The current consent text, served by the backend's catalog. */
export function useConsentTerms() {
  return useQuery({
    queryKey: queryKeys.catalog.consentTerms,
    queryFn: getCurrentConsentTerms,
    staleTime: STALE_TIME.catalog,
  });
}

interface RecordConsentInput {
  readonly initiativeId: string;
  readonly version: string;
}

/** Accepts the consent of an existing initiative again (a new text, or a returning user). */
export function useRecordConsent() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: ({ initiativeId, version }: RecordConsentInput) =>
      recordConsent(initiativeId, version),
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.initiative.mine }),
  });
}
