import { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { LikertValue } from '../../../../shared-kernel/domain/value-objects/likert-value.vo.js';

/**
 * `Answer` — a single response in an `AnswerSheet`. Pure data + the
 * Likert-value invariant; no behavior beyond `equals`.
 *
 * Persisted as one `irl_diagnostic.respuesta` row.
 */
export interface AnswerPersistence {
  readonly id: string;
  readonly statementId: string;
  readonly value: number;
}

export class Answer {
  private constructor(
    public readonly id: Uuid,
    public readonly statementId: Uuid,
    public readonly value: LikertValue,
  ) {}

  /** Create a new answer with a freshly generated id. */
  static create(statementId: Uuid, value: LikertValue): Answer {
    return new Answer(Uuid.generate(), statementId, value);
  }

  /** Hydrate from a persisted row. */
  static fromPersistence(row: AnswerPersistence): Answer {
    return new Answer(
      Uuid.create(row.id),
      Uuid.create(row.statementId),
      LikertValue.create(row.value),
    );
  }

  /** Return a new `Answer` with the same `id` but a different value. */
  withValue(value: LikertValue): Answer {
    return new Answer(this.id, this.statementId, value);
  }

  equals(other: Answer): boolean {
    return this.id.equals(other.id);
  }
}
