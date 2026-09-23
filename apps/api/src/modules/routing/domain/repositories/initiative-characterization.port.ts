import type { Characterization } from '@innlab/contracts';

/**
 * Read port of the initiative characterization (sector and stage).
 *
 * The engine depends on this abstraction instead of on `initiative/`'s
 * tables: `InitiativeCharacterizationAdapter` answers it through
 * `initiative/`'s exported read use case, so the engine never learns how
 * the initiative is stored.
 */
export const INITIATIVE_CHARACTERIZATION_READER = Symbol(
  'INITIATIVE_CHARACTERIZATION_READER',
);

export interface InitiativeCharacterizationPort {
  /**
   * Characterization of the diagnostic's initiative. Every field is `null`
   * when no initiative is registered for the diagnostic.
   */
  findByDiagnosticId(diagnosticId: string): Promise<Characterization>;
}
