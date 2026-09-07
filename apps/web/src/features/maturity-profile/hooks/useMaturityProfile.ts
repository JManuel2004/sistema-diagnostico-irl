import { useQuery } from '@tanstack/react-query';
import { getMaturityProfile } from '../api/maturity-profile.api';
import { queryKeys } from '@/shared/api/query-keys';

export function useMaturityProfile(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.profile(diagnosticId)
      : ['diagnostic', 'profile', 'idle'],
    queryFn: () => getMaturityProfile(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 5 * 60 * 1000,
  });
}
