import { DimensionCode } from '../../../../shared-kernel/domain/value-objects/dimension-code.js';

export type ImbalanceClassification = 'CRITICO' | 'MODERADO' | 'ACEPTABLE';

export interface ImbalanceResultPersistence {
  readonly pairId: number;
  readonly leftCode: string;
  readonly rightCode: string;
  readonly difference: number;
  readonly classification: ImbalanceClassification;
}

export class ImbalanceResult {
  constructor(
    public readonly pairId: number,
    public readonly left: DimensionCode,
    public readonly right: DimensionCode,
    public readonly difference: number,
    public readonly classification: ImbalanceClassification,
  ) {}

  toPersistence(): ImbalanceResultPersistence {
    return {
      pairId: this.pairId,
      leftCode: this.left.value,
      rightCode: this.right.value,
      difference: this.difference,
      classification: this.classification,
    };
  }
}
