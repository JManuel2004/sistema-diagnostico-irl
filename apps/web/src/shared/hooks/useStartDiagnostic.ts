import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { startDiagnostic } from '@/shared/api/diagnostic.api';
import { paths } from '@/shared/lib/paths';

/**
 * Starts a new diagnostic (HU-04) and opens the wizard at its first step.
 * The backend deletes the user's unfinished diagnostics first (DIAGIRL-26):
 * one still open in this tab is continued from the panel instead, which goes
 * straight to the wizard without calling this.
 *
 * Used by the start screen (`/diagnosticos/nuevo`) and the panel.
 */
export function useStartDiagnostic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startDiagnostic,
    onSuccess: async (diagnostic) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list });
      // `replace`: the start screen must not stay in the history, or
      // "back" from the wizard would start another attempt.
      void navigate(paths.wizard(diagnostic.id), { replace: true });
    },
  });
}
