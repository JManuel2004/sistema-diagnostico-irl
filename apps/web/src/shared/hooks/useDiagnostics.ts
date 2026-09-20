import { useQuery } from '@tanstack/react-query';
import { useParams } from 'react-router-dom';
import { queryKeys } from '@/shared/api/query-keys';
import { getDiagnostic, listMyDiagnostics } from '@/shared/api/diagnostic.api';

/**
 * Un diagnóstico del usuario. Trae `state` y `deepAnalysisAccepted`, que el
 * backend deriva: la pantalla de resultados decide qué mostrar con ese
 * indicador y no infiere nada del estado.
 */
export function useDiagnostic(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.detail(diagnosticId)
      : ['diagnostic', 'detail', 'idle'],
    queryFn: () => getDiagnostic(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 30 * 1000,
  });
}

/** Los diagnósticos del usuario, del más reciente al más antiguo. */
export function useMyDiagnostics(enabled = true) {
  return useQuery({
    queryKey: queryKeys.diagnostic.list,
    queryFn: listMyDiagnostics,
    enabled,
    staleTime: 30 * 1000,
  });
}

/**
 * El diagnóstico activo: el de la URL si estamos dentro de uno; si no, el más
 * reciente **con resultados** (`completed`). Un diagnóstico que sigue en el
 * asistente no tiene resultados ni panel que mostrar. `undefined` mientras
 * carga o si el usuario no tiene ninguno terminado.
 */
export function useActiveDiagnosticId(): string | undefined {
  const { id } = useParams<{ id: string }>();
  // Dentro de un diagnóstico no hace falta pedir la lista.
  const mine = useMyDiagnostics(id === undefined);
  return id ?? mine.data?.find((d) => d.completed)?.id;
}
