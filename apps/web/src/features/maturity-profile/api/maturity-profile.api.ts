import { http } from '@/shared/api/http';
import { maturityProfileResponseSchema, type MaturityProfileResponse } from '@innlab/contracts';

/**
 * Llama al endpoint de cálculo del perfil de madurez (DIAGIRL-34).
 *
 * `POST /api/v1/diagnosticos/:id/perfil` toma las 48 respuestas
 * persistidas previamente por HU-33, calcula los 6 niveles IRL y
 * devuelve el perfil. La respuesta se valida contra el schema de
 * `@innlab/contracts` para que el front nunca consuma una forma
 * distinta a la del contrato.
 *
 * Errores del backend (`MaturityProfileCalculationError` → HTTP 500
 * con problem-details) llegan acá como `Error` de axios. La página
 * los muestra como toast genérico ("No fue posible generar el
 * diagnóstico"); la HU-34 explícitamente NO expone resultados
 * parciales en caso de fallo.
 */
export async function computeMaturityProfile(
  diagnosticId: string,
): Promise<MaturityProfileResponse> {
  const { data } = await http.post<unknown>(`/diagnosticos/${diagnosticId}/perfil`);
  return maturityProfileResponseSchema.parse(data);
}
