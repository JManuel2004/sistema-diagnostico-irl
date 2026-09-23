import {
  initiativeSchema,
  initiativeStageSchema,
  sectorSchema,
  type Initiative,
  type InitiativeStage,
  type RegisterInitiativeCommand,
  type Sector,
} from '@innlab/contracts';
import { getParsed, getParsedOrNull, postParsed } from '@/shared/api/http';

export function getSectors(): Promise<Sector[]> {
  return getParsed('/initiative-catalog/sectors', sectorSchema.array());
}

export function getStages(): Promise<InitiativeStage[]> {
  return getParsed('/initiative-catalog/stages', initiativeStageSchema.array());
}

/** The diagnostic's initiative, or `null` if it has not been registered yet (404). */
export function getInitiative(diagnosticId: string): Promise<Initiative | null> {
  return getParsedOrNull(`/diagnostics/${diagnosticId}/initiative`, initiativeSchema);
}

export function registerInitiative(
  diagnosticId: string,
  command: RegisterInitiativeCommand,
): Promise<Initiative> {
  return postParsed(`/diagnostics/${diagnosticId}/initiative`, command, initiativeSchema);
}
