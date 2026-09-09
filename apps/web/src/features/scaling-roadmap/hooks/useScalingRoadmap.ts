import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getScalingRoadmap } from '../api/scaling-roadmap.api';

/**
 * El roadmap es una función determinista del perfil y del grafo
 * sembrado, así que es un snapshot igual de estable que el perfil de
 * madurez y comparte su `staleTime` de 5 minutos.
 */
export function useScalingRoadmap(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId
      ? queryKeys.diagnostic.roadmap(diagnosticId)
      : ['diagnostic', 'roadmap', 'idle'],
    queryFn: () => getScalingRoadmap(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 5 * 60 * 1000,
  });
}
