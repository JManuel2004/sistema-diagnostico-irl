import { http } from '@/shared/api/http';
import { maturityProfileResponseSchema, type MaturityProfileResponse } from '@innlab/contracts';

export async function getMaturityProfile(
  diagnosticId: string,
): Promise<MaturityProfileResponse> {
  const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}/profile`);
  return maturityProfileResponseSchema.parse(data);
}
