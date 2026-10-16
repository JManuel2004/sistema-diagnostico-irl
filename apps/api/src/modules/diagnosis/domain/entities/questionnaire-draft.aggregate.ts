import { LikertValue } from '../../../../shared/kernel/domain/value-objects/likert-value.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { MAX_JUSTIFICATION_LENGTH } from './answer.entity.js';

/** One statement of the draft as it is stored and read. */
export interface DraftEntryPersistence {
  readonly statementId: string;
  /** Likert 1..5, or `null` while the level is not chosen. */
  readonly value: number | null;
  readonly justification: string | null;
}

/**
 * `QuestionnaireDraft` — what the user has answered so far of a diagnostic
 * still being filled in, saved on the server so it survives closing the
 * session and can be resumed from any device.
 *
 * Unlike `AnswerSheet` it may be partial, and an entry may carry only the
 * justification (the user may write why before choosing the level). An entry
 * with neither is not kept. The draft is replaced as a whole on every save:
 * the client always sends everything it has.
 */
export class QuestionnaireDraft {
  private constructor(
    public readonly diagnosticId: string,
    private readonly byStatement: ReadonlyMap<string, DraftEntryPersistence>,
    public readonly updatedAt: Date | null,
  ) {}

  static empty(diagnosticId: string): QuestionnaireDraft {
    return new QuestionnaireDraft(diagnosticId, new Map(), null);
  }

  static fromPersistence(
    diagnosticId: string,
    rows: readonly DraftEntryPersistence[],
    updatedAt: Date | null,
  ): QuestionnaireDraft {
    return new QuestionnaireDraft(
      diagnosticId,
      new Map(rows.map((row) => [row.statementId, row])),
      updatedAt,
    );
  }

  /**
   * Builds the draft the user sent. Throws `InvariantViolationError` for a
   * level out of 1..5, a justification that is too long or a statement that
   * appears twice: the client never sends those.
   */
  static from(
    diagnosticId: string,
    entries: readonly {
      statementId: string;
      value: number | null;
      justification: string | null;
    }[],
  ): QuestionnaireDraft {
    const byStatement = new Map<string, DraftEntryPersistence>();
    for (const entry of entries) {
      if (byStatement.has(entry.statementId)) {
        throw new InvariantViolationError(
          `Statement '${entry.statementId}' appears twice in the draft`,
          { statementId: entry.statementId },
        );
      }
      const value =
        entry.value === null ? null : LikertValue.create(entry.value).value;
      const justification = QuestionnaireDraft.validJustification(
        entry.statementId,
        entry.justification,
      );
      if (value === null && justification === null) continue;
      byStatement.set(entry.statementId, {
        statementId: entry.statementId,
        value,
        justification,
      });
    }
    return new QuestionnaireDraft(diagnosticId, byStatement, null);
  }

  entries(): readonly DraftEntryPersistence[] {
    return [...this.byStatement.values()];
  }

  statementIds(): readonly string[] {
    return [...this.byStatement.keys()];
  }

  /** Statements with a level chosen. */
  get answeredCount(): number {
    return this.entries().filter((e) => e.value !== null).length;
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
