import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import type { RegisterInitiativeCommand } from '@innlab/contracts';
import { queryKeys } from '@/shared/api/query-keys';
import { STALE_TIME } from '@/shared/api/query-client';
import { invalidateDiagnostic } from '@/shared/api/invalidate-diagnostic';
import { useDiagnosticQuery } from '@/shared/hooks/useDiagnosticQuery';
import {
  createInitiative,
  getInitiative,
  getSectors,
  getStages,
  listMyInitiatives,
  registerInitiative,
} from '../api/initiative.api';

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

/** The user's initiatives, each with its latest consent and profile. */
export function useMyInitiatives() {
  return useQuery({
    queryKey: queryKeys.initiative.mine,
    queryFn: listMyInitiatives,
    staleTime: STALE_TIME.diagnosticInput,
  });
}

/** Creates an initiative with its first consent; the argument is the accepted text's version. */
export function useCreateInitiative() {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: createInitiative,
    onSuccess: () => queryClient.invalidateQueries({ queryKey: queryKeys.initiative.mine }),
  });
}

/** The initiative profile registered for a diagnostic, or `null`. */
export function useInitiative(diagnosticId: string | undefined) {
  return useDiagnosticQuery(diagnosticId, queryKeys.diagnostic.initiative, getInitiative, {
    staleTime: STALE_TIME.diagnosticInput,
  });
}

export function useRegisterInitiative(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (command: RegisterInitiativeCommand) =>
      registerInitiative(diagnosticId ?? '', command),
    onSuccess: async () => {
      if (!diagnosticId) return;
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.initiative(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.initiative.mine }),
        invalidateDiagnostic(queryClient, diagnosticId),
      ]);
    },
  });
}
