import { DimensionCode } from '../../../shared-kernel/domain/value-objects/dimension-code.js';
import { InvariantViolationError } from '../../../shared-kernel/domain/errors/invariant-violation.error.js';

/**
 * `Dimension` — domain entity representing one of the six IRL dimensions
 * (TRL, CRL, BRL, IPRL, TmRL, FRL).
 *
 * Read-only at runtime — the constructor is the only way to instantiate
 * one, and the repository is the only producer. Application code holds
 * Dimension instances but never mutates them; updates ship through
 * catalog seeds.
 *
 * The Spanish persistence model speaks `dimension(codigo, nombre,
 * descripcion, orden)`; this domain class uses English property names
 * per the project's bilingual rule (CLAUDE.md → CODE-STYLE).
 */
export interface DimensionPersistence {
  readonly id: number;
  readonly code: string;
  readonly name: string;
  readonly description: string;
  readonly sequence: number;
}

export class Dimension {
  private constructor(
    public readonly id: number,
    public readonly code: DimensionCode,
    public readonly name: string,
    public readonly description: string,
    public readonly sequence: number,
  ) {}

  static fromPersistence(row: DimensionPersistence): Dimension {
    if (
      row.sequence < 1 ||
      row.sequence > 6 ||
      !Number.isInteger(row.sequence)
    ) {
      throw new InvariantViolationError(
        `Dimension sequence must be an integer in [1, 6]; received ${String(row.sequence)}`,
      );
    }
    return new Dimension(
      row.id,
      DimensionCode.create(row.code),
      row.name,
      row.description,
      row.sequence,
    );
  }
}
