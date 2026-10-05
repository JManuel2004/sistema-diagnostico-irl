import { LikertValue } from '../../../../shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

export const MAX_JUSTIFICATION_LENGTH = 1000;

export interface AnswerPersistence {
  readonly statementId: string;
  readonly value: number;
  readonly justification: string | null;
}

/**
 * An answer to one statement: the Likert value and, optionally, the user's
 * reason for it.
 *
 * The justification is optional. A blank one is normalized to `null` here,
 * so the database never receives whitespace (`ck_answer_justification`), and
 * one over the length limit is rejected as an invariant violation before
 * the sheet is built.
 */
export class Answer {
  private constructor(
    public readonly statementId: string,
    public readonly value: LikertValue,
    public readonly justification: string | null,
  ) {}

  static create(
    statementId: string,
    value: LikertValue,
    justification: string | null,
  ): Answer {
    return new Answer(
      statementId,
      value,
      Answer.validJustification(statementId, justification),
    );
  }

  static fromPersistence(row: AnswerPersistence): Answer {
    return new Answer(
      row.statementId,
      LikertValue.create(row.value),
      row.justification,
    );
  }

  withResponse(value: LikertValue, justification: string | null): Answer {
    return new Answer(
      this.statementId,
      value,
      Answer.validJustification(this.statementId, justification),
    );
  }

  equals(other: Answer): boolean {
    return this.statementId === other.statementId;
  }

  private static validJustification(
    statementId: string,
    raw: string | null,
  ): string | null {
    const justification = typeof raw === 'string' ? raw.trim() : '';
    if (justification.length === 0) return null;
    if (justification.length > MAX_JUSTIFICATION_LENGTH) {
      throw new InvariantViolationError(
        `The justification of statement '${statementId}' exceeds ${String(MAX_JUSTIFICATION_LENGTH)} characters`,
        { statementId, length: justification.length },
      );
    }
    return justification;
  }
}
