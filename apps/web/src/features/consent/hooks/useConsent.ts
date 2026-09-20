import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { getConsent, recordConsent } from '../api/consent.api';
import { CONSENT_TERMS_VERSION } from '../lib/consent-terms';

/** `null` cuando el diagnóstico aún no tiene el consentimiento aceptado. */
export function useConsent(diagnosticId: string | undefined) {
  return useQuery({
    queryKey: diagnosticId ? queryKeys.diagnostic.consent(diagnosticId) : ['diagnostic', 'consent', 'idle'],
    queryFn: () => getConsent(diagnosticId!),
    enabled: Boolean(diagnosticId),
    staleTime: 60 * 1000,
  });
}

/**
 * Aceptar el texto vigente. El consentimiento se guarda en la caché apenas
 * responde el backend: si el paso siguiente falla y el usuario reintenta, el
 * asistente ya sabe que aceptó y no lo vuelve a pedir. También mueve el
 * diagnóstico de estado (por un evento del backend), así que se invalida.
 */
export function useRecordConsent(diagnosticId: string | undefined) {
  const queryClient = useQueryClient();
  return useMutation({
    mutationFn: () => recordConsent(diagnosticId!, CONSENT_TERMS_VERSION),
    onSuccess: async (record) => {
      if (!diagnosticId) return;
      queryClient.setQueryData(queryKeys.diagnostic.consent(diagnosticId), record);
      await Promise.all([
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.detail(diagnosticId) }),
        queryClient.invalidateQueries({ queryKey: queryKeys.diagnostic.list }),
      ]);
    },
  });
}
