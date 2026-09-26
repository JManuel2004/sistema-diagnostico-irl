import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getQuestionnaireStructure } from '../api/questionnaire-catalog.api';

/**
 * The statements of the IRL framework version a diagnostic is answered
 * with (`Diagnostic.frameworkVersion`). A published version never changes,
 * so it is cached for the whole session. Waits while the version is not
 * known yet.
 */
export function useQuestionnaireStructure(frameworkVersion: string | undefined) {
  return useQuery({
    queryKey: queryKeys.catalog.questionnaire(frameworkVersion ?? ''),
    queryFn: () => getQuestionnaireStructure(frameworkVersion ?? ''),
    enabled: frameworkVersion !== undefined,
    staleTime: Infinity,
    gcTime: Infinity,
  });
}
