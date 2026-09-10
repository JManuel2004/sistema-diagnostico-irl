import { type MaturityProfileResponse } from '@innlab/contracts';
import { http, isMissingHttpRoute } from '@/shared/api/http';
import { parseMaturityProfileResponse } from '@/shared/api/parse-maturity-profile';

export async function finalizeInitialDiagnostic(
  diagnosticId: string,
  answers: { statementId: string; value: number }[],
): Promise<MaturityProfileResponse> {
  try {
    const { data } = await http.post<unknown>(
      `/diagnosticos/${diagnosticId}/finalizar-inicial`,
      { answers },
    );
    return parseMaturityProfileResponse(data);
  } catch (error) {
    // Render todavía sirve el API de mayo, sin el orquestador.
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    await http.post(`/diagnosticos/${diagnosticId}/cuestionario`, { answers });
    const { data } = await http.post<unknown>(`/diagnosticos/${diagnosticId}/perfil`);
    return parseMaturityProfileResponse(data);
  }
}
