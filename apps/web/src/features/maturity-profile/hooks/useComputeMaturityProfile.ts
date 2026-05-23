import { useMutation, useQueryClient } from '@tanstack/react-query';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { computeMaturityProfile } from '../api/maturity-profile.api';
import { queryKeys } from '@/shared/api/query-keys';

/**
 * Mutation para disparar el cálculo del perfil de madurez (DIAGIRL-34).
 *
 * Devuelve `MaturityProfileResponse`. Tras éxito, hace `setQueryData`
 * en `queryKeys.diagnostic.profile(id)` para que cualquier futura
 * lectura del perfil (DIAGIRL-37 resumen numérico, etc.) lo encuentre
 * en cache sin volver a hacer GET. El perfil es un snapshot inmutable
 * (per STATE_MANAGEMENT.md, `staleTime: Infinity`).
 *
 * Uso típico (en `QuestionnairePage` tras submit completo):
 *   const { mutateAsync } = useComputeMaturityProfile();
 *   await mutateAsync(diagnosticId);
 *   navigate(`/diagnosticos/${diagnosticId}/perfil`);
 */
export function useComputeMaturityProfile() {
  const queryClient = useQueryClient();

  return useMutation<MaturityProfileResponse, Error, string>({
    mutationFn: (diagnosticId: string) => computeMaturityProfile(diagnosticId),
    onSuccess: (data, diagnosticId) => {
      queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), data);
    },
  });
}
