import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RegisterInitiativeCommand } from '@innlab/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { getInitiative, getSectors, getStages, registerInitiative } from '../api/initiative.api';

const CATALOG_STALE = 60 * 60 * 1000;

export function useSectors() {
  return useQuery({
    queryKey: queryKeys.catalog.sectors,
    queryFn: getSectors,
    staleTime: CATALOG_STALE,
  });
}

export function useStages() {
  return useQuery({
    queryKey: queryKeys.catalog.stages,
    queryFn: getStages,
    staleTime: CATALOG_STALE,
  });
}

/** `null` cuando el diagnóstico aún no tiene iniciativa registrada. */
export function useInitiative(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.initiative(diagnosticId)
      : ['diagnostic', 'initiative', 'idle'],
    queryFn: () => getInitiative(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 60 * 1000,
  });
}

/**
 * Registrar (o actualizar) la iniciativa mueve el diagnóstico de estado en el
 * backend, así que también se invalida el diagnóstico y su lista.
 */
export function useRegisterInitiative(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: RegisterInitiativeCommand) => registerInitiative(diagnosticId!, command),
    onSuccess: async () => {
      if (!diagnosticId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.initiative(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
    },
  });
}
