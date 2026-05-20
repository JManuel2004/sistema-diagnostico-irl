import type { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import type { LikertValue } from '../../../../shared-kernel/domain/value-objects/likert-value.vo.js';
import { Answer } from './answer.entity.js';
import type { AnswerPersistence } from './answer.entity.js';

/**
 * `AnswerSheet` — aggregate root that owns the set of `Answer` entities
 * tied to a single diagnostic.
 *
 * The aggregate enforces that each statement appears at most once —
 * duplicate `statementId` writes are an upsert, not an append.
 *
 * `statementId` is the bigint PK of `irl_catalog.afirmacion` serialised
 * as string (TypeORM returns bigint columns as string). It is NOT a UUID.
 */
export class AnswerSheet {
  private constructor(
    public readonly diagnosticId: Uuid,
    private readonly answersByStatement: Map<string, Answer>,
  ) {}

  static create(diagnosticId: Uuid): AnswerSheet {
    return new AnswerSheet(diagnosticId, new Map());
  }

  static fromPersistence(
    diagnosticId: Uuid,
    rows: readonly AnswerPersistence[],
  ): AnswerSheet {
    const map = new Map<string, Answer>();
    for (const row of rows) {
      map.set(row.statementId, Answer.fromPersistence(row));
    }
    return new AnswerSheet(diagnosticId, map);
  }

  setAnswer(statementId: string, value: LikertValue): AnswerSheet {
    const existing = this.answersByStatement.get(statementId);
    const next = existing ? existing.withValue(value) : Answer.create(statementId, value);
    this.answersByStatement.set(statementId, next);
    return this;
  }

  getAnswer(statementId: string): Answer | undefined {
    return this.answersByStatement.get(statementId);
  }

  get answeredCount(): number {
    return this.answersByStatement.size;
  }

  answers(): readonly Answer[] {
    return [...this.answersByStatement.values()];
  }

  toPersistence(): AnswerPersistence[] {
    return [...this.answersByStatement.values()].map((a) => ({
      statementId: a.statementId,
      value: a.value.value,
    }));
  }
}
