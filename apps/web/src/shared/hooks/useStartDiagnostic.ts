import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { startDiagnostic } from '@/shared/api/diagnostic.api';
import { paths } from '@/shared/lib/paths';

/**
 * Starts a new diagnostic (HU-04) and opens the wizard at its first step.
 * While the user has one in progress the backend answers 409
 * `DIAGNOSIS_IN_PROGRESS` and deletes nothing: the caller asks the user, and
 * only `{ discardInProgress: true }` deletes it (with its saved answers).
 *
 * Used by the start screen (`/diagnosticos/nuevo`) and the panel.
 */
export function useStartDiagnostic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: (options: { readonly discardInProgress?: boolean } | void) =>
      startDiagnostic(options?.discardInProgress === true),
    onSuccess: async (diagnostic) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list });
      await queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.inProgress });
      // `replace`: the start screen must not stay in the history, or
      // "back" from the wizard would start another attempt.
      void navigate(paths.wizard(diagnostic.id), { replace: true });
    },
  });
}
