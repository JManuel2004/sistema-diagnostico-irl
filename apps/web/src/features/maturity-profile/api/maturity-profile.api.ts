import { maturityProfileResponseSchema, type MaturityProfileResponse } from '@innlab/contracts';
import { getParsed } from '@/shared/api/http';

export function getMaturityProfile(diagnosticId: string): Promise<MaturityProfileResponse> {
  return getParsed(`/diagnostics/${diagnosticId}/profile`, maturityProfileResponseSchema);
}
