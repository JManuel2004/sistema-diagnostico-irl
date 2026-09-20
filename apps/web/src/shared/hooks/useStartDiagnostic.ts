import { useMutation, useQueryClient } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { startDiagnostic } from '@/shared/api/diagnostic.api';

/**
 * Iniciar un diagnóstico (HU-04) y abrir el asistente. Si el usuario ya tiene
 * uno sin terminar, el backend devuelve ese y se reanuda: nunca se crea uno
 * nuevo encima. El asistente decide en qué paso queda el usuario.
 *
 * Lo usan la pantalla de inicio (`/diagnosticos/nuevo`) y el panel.
 */
export function useStartDiagnostic() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: startDiagnostic,
    onSuccess: async (diagnostic) => {
      await queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list });
      // `replace`: la pantalla de inicio no debe quedar en el historial, o
      // «atrás» desde el asistente volvería a arrancar otro intento.
      void navigate(`/diagnosticos/${diagnostic.id}/asistente`, { replace: true });
    },
  });
}
