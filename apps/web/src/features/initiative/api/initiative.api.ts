import {
  initiativeSchema,
  initiativeStageSchema,
  sectorSchema,
  type Initiative,
  type InitiativeStage,
  type RegisterInitiativeCommand,
  type Sector,
} from '@innlab/contracts';
import { ApiError, http } from '@/shared/api/http';

export async function getSectors(): Promise<Sector[]> {
  const { data } = await http.get<unknown>('/initiative-catalog/sectors');
  return sectorSchema.array().parse(data);
}

export async function getStages(): Promise<InitiativeStage[]> {
  const { data } = await http.get<unknown>('/initiative-catalog/stages');
  return initiativeStageSchema.array().parse(data);
}

/** The diagnostic's initiative, or `null` if it has not been registered yet (404). */
export async function getInitiative(diagnosticId: string): Promise<Initiative | null> {
  try {
    const { data } = await http.get<unknown>(`/diagnostics/${diagnosticId}/initiative`);
    return initiativeSchema.parse(data);
  } catch (error) {
    if (error instanceof ApiError && error.status === 404) return null;
    throw error;
  }
}

export async function registerInitiative(
  diagnosticId: string,
  command: RegisterInitiativeCommand,
): Promise<Initiative> {
  const { data } = await http.post<unknown>(`/diagnostics/${diagnosticId}/initiative`, command);
  return initiativeSchema.parse(data);
}
