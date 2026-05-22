import { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { LikertValue } from '../../../../shared-kernel/domain/value-objects/likert-value.vo.js';

/**
 * `Answer` — a single response in an `AnswerSheet`. Pure data + the
 * Likert-value invariant; no behavior beyond `equals`.
 *
 * `statementId` is the bigint PK of `irl_catalog.afirmacion`, returned
 * by TypeORM as a string. It is NOT a UUID.
 *
 * `id` (the `respuesta` PK) is a bigint GENERATED ALWAYS AS IDENTITY —
 * the database assigns it on INSERT. The domain entity does not carry
 * it; only the repository layer sees it.
 *
 * Persisted as one `irl_diagnostic.respuesta` row.
 */
export interface AnswerPersistence {
  readonly statementId: string;
  readonly value: number;
}

export class Answer {
  private constructor(
    public readonly statementId: string,
    public readonly value: LikertValue,
  ) {}

  static create(statementId: string, value: LikertValue): Answer {
    return new Answer(statementId, value);
  }

  static fromPersistence(row: AnswerPersistence): Answer {
    return new Answer(row.statementId, LikertValue.create(row.value));
  }

  withValue(value: LikertValue): Answer {
    return new Answer(this.statementId, value);
  }

  equals(other: Answer): boolean {
    return this.statementId === other.statementId;
  }
}
