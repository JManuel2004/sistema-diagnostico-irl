import { http } from '@/shared/api/http';
import { maturityProfileResponseSchema, type MaturityProfileResponse } from '@innlab/contracts';

export async function computeMaturityProfile(
  diagnosticId: string,
): Promise<MaturityProfileResponse> {
  const { data } = await http.post<unknown>(`/diagnosticos/${diagnosticId}/perfil`);
  return maturityProfileResponseSchema.parse(data);
}
