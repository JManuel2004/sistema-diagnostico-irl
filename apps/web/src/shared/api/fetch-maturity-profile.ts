import { type MaturityProfileResponse } from '@innlab/contracts';
import { http, isMissingHttpRoute } from '@/shared/api/http';
import { parseMaturityProfileResponse } from '@/shared/api/parse-maturity-profile';

export async function fetchMaturityProfile(
  diagnosticId: string,
): Promise<MaturityProfileResponse> {
  try {
    const { data } = await http.get<unknown>(`/diagnosticos/${diagnosticId}/perfil`);
    return parseMaturityProfileResponse(data);
  } catch (error) {
    if (!isMissingHttpRoute(error)) {
      throw error;
    }
    const { data } = await http.post<unknown>(`/diagnosticos/${diagnosticId}/perfil`);
    return parseMaturityProfileResponse(data);
  }
}
