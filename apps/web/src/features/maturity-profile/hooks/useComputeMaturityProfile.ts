import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { computeMaturityProfile } from '../api/maturity-profile.api';
import { queryKeys } from '@/shared/api/query-keys';

export function useComputeMaturityProfile() {
  const queryClient = useQueryClient();

  return useMutation<MaturityProfileResponse, Error, string>({
    mutationFn: (diagnosticId: string) => computeMaturityProfile(diagnosticId),
    onSuccess: (data, diagnosticId) => {
      queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), data);
    },
  });
}
