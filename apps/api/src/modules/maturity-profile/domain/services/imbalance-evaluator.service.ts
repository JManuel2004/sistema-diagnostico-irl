import { Injectable } from '@nestjs/common';
import type { DimensionPair } from '../../../irl-catalog/domain/dimension-pair.js';
import { DimensionCode } from '../../../../shared-kernel/domain/value-objects/dimension-code.js';
import {
  ImbalanceResult,
  type ImbalanceClassification,
} from '../value-objects/imbalance-result.vo.js';

/**
 * Pure domain service — RF-10.
 *
 * Evaluates the six fixed KTH pairs against the computed dimension levels
 * and classifies each gap:
 *   - difference > 3  → CRITICO
 *   - difference 2–3  → MODERADO
 *   - difference < 2  → ACEPTABLE
 *
 * No side effects. Input and output are domain objects only.
 */
@Injectable()
export class ImbalanceEvaluatorService {
  evaluate(
    levelByCode: ReadonlyMap<string, number>,
    pairs: readonly DimensionPair[],
  ): ImbalanceResult[] {
    return pairs.map((pair) => {
      const la = levelByCode.get(pair.left.value) ?? 0;
      const lb = levelByCode.get(pair.right.value) ?? 0;
      const difference = Math.abs(la - lb);
      return new ImbalanceResult(
        pair.id,
        DimensionCode.create(pair.left.value),
        DimensionCode.create(pair.right.value),
        difference,
        this.classify(difference),
      );
    });
  }

  private classify(difference: number): ImbalanceClassification {
    if (difference > 3) return 'CRITICO';
    if (difference >= 2) return 'MODERADO';
    return 'ACEPTABLE';
  }
}
