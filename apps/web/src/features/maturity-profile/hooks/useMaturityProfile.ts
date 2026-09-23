import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { getMaturityProfile } from '../api/maturity-profile.api';

export function useMaturityProfile(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.profile, getMaturityProfile, {
    staleTime: STALE_TIME.savedResult,
  });
}
