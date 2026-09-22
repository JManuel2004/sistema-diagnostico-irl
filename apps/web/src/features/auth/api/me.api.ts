import { meContextResponseSchema, type MeContextResponse } from '@innlab/contracts';
import { http } from '@/shared/api/http';

/**
 * Contexto de la sesión activa: identidad del usuario y su pertenencia
 * organizacional.
 *
 * Va contra NUESTRO backend, no contra INNLAB Core. El navegador nunca
 * llama a `/internal/*` de Core: esa superficie exige la credencial de
 * servicio y es estrictamente backend-a-backend. Nuestro servidor hace
 * de intermediario y solo expone lo que el frontend necesita.
 */
export async function getMeContext(): Promise<MeContextResponse> {
  const { data } = await http.get<unknown>('/me/context');
  return meContextResponseSchema.parse(data);
}
