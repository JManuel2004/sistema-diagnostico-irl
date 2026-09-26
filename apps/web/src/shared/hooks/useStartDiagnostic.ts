import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { startDiagnostic } from '@/shared/api/diagnostic.api';
import { paths } from '@/shared/lib/paths';

/**
 * Starts a diagnostic (HU-04) and opens the wizard. If the user already has
 * an unfinished one, the backend returns it and it is resumed: a new one is
 * never created on top. The wizard decides which step the user lands on.
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
