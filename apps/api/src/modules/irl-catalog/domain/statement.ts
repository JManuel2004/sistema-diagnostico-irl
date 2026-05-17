import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { DimensionCode } from '../../../shared-kernel/domain/value-objects/dimension-code.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `Statement` — domain entity representing one of the 48 questionnaire
 * statements (an `afirmacion` in the persistence model).
 *
 * Invariants enforced at construction:
 *   - `sequence` is an integer in `[1, 8]` (8 statements per dimension).
 *   - `dimensionCode` is one of the six valid codes.
 *   - `text` is non-empty.
 *
 * Per the bilingual rule (CLAUDE.md): the database column is `texto`,
 * the domain property is `text`. The English domain name `Statement`
 * is allowed by CODE-STYLE because it is a scale concept; the
 * persistence-layer ORM class is `AfirmacionOrm`.
 */
export interface StatementPersistence {
  readonly id: string;
  readonly dimensionId: string;
  readonly dimensionCode: string;
  readonly sequence: number;
  readonly text: string;
}

export class Statement {
  private constructor(
    public readonly id: Uuid,
    public readonly dimensionId: Uuid,
    public readonly dimensionCode: DimensionCode,
    public readonly sequence: number,
    public readonly text: string,
  ) {}

  static fromPersistence(row: StatementPersistence): Statement {
    if (
      row.sequence < 1 ||
      row.sequence > 8 ||
      !Number.isInteger(row.sequence)
    ) {
      throw new InvariantViolationError(
        `Statement sequence must be an integer in [1, 8]; received ${String(row.sequence)}`,
      );
    }
    if (row.text.trim().length === 0) {
      throw new InvariantViolationError('Statement text must be non-empty');
    }
    return new Statement(
      Uuid.create(row.id),
      Uuid.create(row.dimensionId),
      DimensionCode.create(row.dimensionCode),
      row.sequence,
      row.text,
    );
  }
}
