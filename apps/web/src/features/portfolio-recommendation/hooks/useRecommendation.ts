import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import {
  generateRecommendation,
  getRecommendation,
  getRecommendationTrace,
} from '../api/recommendation.api';

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

export function useGenerateRecommendation(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => generateRecommendation(diagnosticId!),
    onSuccess: (data) => {
      if (!diagnosticId) return;
      queryClient.setQueryData(
        queryKeys.diagnostic.recommendation(diagnosticId),
        data,
      );
      // La traza cambia con cada regeneración; invalidarla evita mostrar
      // la explicación de una evaluación anterior junto a un resultado nuevo.
      void queryClient.invalidateQueries({
        queryKey: queryKeys.diagnostic.recommendationTrace(diagnosticId),
      });
    },
  });
}
