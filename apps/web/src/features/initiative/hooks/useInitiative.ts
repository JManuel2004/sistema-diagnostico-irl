import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RegisterInitiativeCommand } from '@innlab/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { invalidateDiagnostic } from '@/shared/api/invalidate-diagnostic';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import { getInitiative, getSectors, getStages, registerInitiative } from '../api/initiative.api';

export function useSectors() {
  return useQuery({
    queryKey: queryKeys.catalog.sectors,
    queryFn: getSectors,
    staleTime: STALE_TIME.catalog,
  });
}

export function useStages() {
  return useQuery({
    queryKey: queryKeys.catalog.stages,
    queryFn: getStages,
    staleTime: STALE_TIME.catalog,
  });
}

/** `null` while the diagnostic has no registered initiative. */
export function useInitiative(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.initiative, getInitiative, {
    staleTime: STALE_TIME.diagnosticInput,
  });
}

/**
 * Registering (or updating) the initiative moves the diagnostic's state in
 * the backend, so the diagnostic and its list are invalidated too.
 */
export function useRegisterInitiative(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: RegisterInitiativeCommand) =>
      registerInitiative(diagnosticId ?? '', command),
    onSuccess: async () => {
      if (!diagnosticId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.initiative(diagnosticId) }),
        invalidateDiagnostic(queryClient, diagnosticId),
      ]);
    },
  });
}
