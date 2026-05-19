import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getQuestionnaireStructure } from '../api/questionnaire-catalog.api';

export function useQuestionnaireStructure() {
  return useQuery({
    queryKey: queryKeys.catalog.questionnaire,
    queryFn: getQuestionnaireStructure,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
