import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { acceptDeepAnalysis } from '@/shared/api/diagnostic.api';
import { getRecommendation, getRecommendationTrace } from '../api/recommendation.api';

/**
 * La recomendación es un snapshot inmutable una vez generada, igual que el
 * perfil de madurez, así que comparte su `staleTime` de 5 minutos.
 */
export function useRecommendation(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.recommendation(diagnosticId)
      : ['diagnostic', 'recommendation', 'idle'],
    queryFn: () => getRecommendation(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * La traza se pide aparte y solo cuando alguien la despliega: su audiencia
 * es el equipo de INNLAB, no el líder de iniciativa, y es bastante más
 * pesada que la recomendación.
 */
export function useRecommendationTrace(
  diagnosticId: string | undefined,
  enabled: boolean,
) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.recommendationTrace(diagnosticId)
      : ['diagnostic', 'recommendation-trace', 'idle'],
    queryFn: () => getRecommendationTrace(diagnosticId!),
    enabled: Boolean(diagnosticId) && enabled,
    staleTime: 5 * 60 * 1000,
  });
}

/**
 * Ya no dispara el cálculo de la recomendación directamente: acepta el
 * análisis profundo en `diagnosis/`, que publica `DeepAnalysisRequestedEvent`
 * y deja que `routing/` (y `roadmap/`) calculen por su cuenta. Al terminar,
 * el resultado ya está persistido, así que solo hay que volver a leerlo.
 *
 * `onSuccess` devuelve la promesa de la invalidación para que la mutación
 * siga en `pending` hasta que la relectura termina: así la página no ve un
 * hueco entre "aceptado" y "recomendación disponible".
 */
export function useAcceptDeepAnalysis(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => acceptDeepAnalysis(diagnosticId!),
    onSuccess: async () => {
      if (!diagnosticId) return;
      await Promise.all([
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.recommendation(diagnosticId),
        }),
        // La traza y el roadmap se recalculan con el análisis; invalidarlos
        // evita mostrar el resultado de una evaluación anterior.
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.recommendationTrace(diagnosticId),
        }),
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.roadmap(diagnosticId),
        }),
        // La página de resultados decide qué mostrar con `deepAnalysisAccepted`,
        // que cambia al aceptar.
        queryClient.invalidateQueries({
          queryKey: queryKeys.diagnostic.detail(diagnosticId),
        }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
    },
  });
}
