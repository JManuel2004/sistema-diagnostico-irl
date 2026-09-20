import { LikertValue } from '../../../../shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

export const MAX_JUSTIFICATION_LENGTH = 1000;

export interface AnswerPersistence {
  readonly statementId: string;
  readonly value: number;
  readonly justification: string;
}

/**
 * An answer to one statement: the Likert value and the user's reason for it.
 *
 * The justification is mandatory. It is checked here, not only in the
 * database, so a blank one is rejected as an invariant violation before the
 * sheet is built.
 */
export class Answer {
  private constructor(
    public readonly statementId: string,
    public readonly value: LikertValue,
    public readonly justification: string,
  ) {}

  static create(statementId: string, value: LikertValue, justification: string): Answer {
    return new Answer(statementId, value, Answer.validJustification(statementId, justification));
  }

  static fromPersistence(row: AnswerPersistence): Answer {
    return new Answer(row.statementId, LikertValue.create(row.value), row.justification);
  }

  withResponse(value: LikertValue, justification: string): Answer {
    return new Answer(
      this.statementId,
      value,
      Answer.validJustification(this.statementId, justification),
    );
  }

  equals(other: Answer): boolean {
    return this.statementId === other.statementId;
  }

  private static validJustification(statementId: string, raw: string): string {
    const justification = typeof raw === 'string' ? raw.trim() : '';
    if (justification.length === 0) {
      throw new InvariantViolationError(
        `The justification of statement '${statementId}' is required`,
        { statementId },
      );
    }
    if (justification.length > MAX_JUSTIFICATION_LENGTH) {
      throw new InvariantViolationError(
        `The justification of statement '${statementId}' exceeds ${String(MAX_JUSTIFICATION_LENGTH)} characters`,
        { statementId, length: justification.length },
      );
    }
    return justification;
  }
}
