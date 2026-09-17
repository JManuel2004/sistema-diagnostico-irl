import { http } from '@/shared/api/http';
import { maturityProfileResponseSchema, type MaturityProfileResponse } from '@innlab/contracts';

export async function finalizeInitialDiagnostic(
  diagnosticId: string,
  answers: { statementId: string; value: number }[],
): Promise<MaturityProfileResponse> {
  const { data } = await http.post<unknown>(
    `/diagnostics/${diagnosticId}/finalize-initial`,
    { answers },
  );
  return maturityProfileResponseSchema.parse(data);
}
