import type { ImbalanceResult } from '../value-objects/imbalance-result.vo.js';

export const IMBALANCE_REPOSITORY = Symbol('IMBALANCE_REPOSITORY');

export interface ImbalanceRepositoryPort {
  save(diagnosticId: string, results: readonly ImbalanceResult[]): Promise<void>;
}
