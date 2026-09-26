import {
  initiativeSchema,
  initiativeStageSchema,
  initiativeSummarySchema,
  sectorSchema,
  type Initiative,
  type InitiativeStage,
  type InitiativeSummary,
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

export function listMyInitiatives(): Promise<InitiativeSummary[]> {
  return getParsed('/initiatives', initiativeSummarySchema.array());
}

/** Creates an initiative together with its first consent, to `version` of the text. */
export function createInitiative(version: string): Promise<InitiativeSummary> {
  return postParsed('/initiatives', { version }, initiativeSummarySchema);
}

export function getInitiative(diagnosticId: string): Promise<Initiative | null> {
  return getParsedOrNull(`/diagnostics/${diagnosticId}/initiative`, initiativeSchema);
}

export function registerInitiative(
  diagnosticId: string,
  command: RegisterInitiativeCommand,
): Promise<Initiative> {
  return postParsed(`/diagnostics/${diagnosticId}/initiative`, command, initiativeSchema);
}
