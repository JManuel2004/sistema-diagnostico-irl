import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { invalidateDiagnostic } from '@/shared/api/invalidate-diagnostic';
import { finalizeInitialDiagnostic } from '@/shared/api/diagnostic.api';
import { paths } from '@/shared/lib/paths';

export interface FinalizeAnswer {
  readonly statementId: string;
  readonly value: number;
  readonly justification: string;
}

/**
 * «Procesar diagnóstico»: sends the 48 answers with their justifications,
 * stores the computed profile in the cache and opens the results.
 */
export function useFinalizeDiagnostic(diagnosticId: string) {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (answers: readonly FinalizeAnswer[]) =>
      finalizeInitialDiagnostic(diagnosticId, [...answers]),
    onSuccess: async (profile) => {
      queryClient.setQueryData(queryKeys.diagnostic.profile(diagnosticId), profile);
      // Waits for the refetch: the results screen decides from `completed`,
      // and with the old datum it would send the user back to the wizard.
      await invalidateDiagnostic(queryClient, diagnosticId);
      void navigate(paths.results(diagnosticId), { replace: true });
    },
  });
}
