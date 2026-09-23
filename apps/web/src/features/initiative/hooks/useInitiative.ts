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

/** `null` while the diagnostic has no registered initiative. */
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
 * Registering (or updating) the initiative moves the diagnostic's state in
 * the backend, so the diagnostic and its list are invalidated too.
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
