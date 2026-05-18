import type { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import type { LikertValue } from '../../../../shared-kernel/domain/value-objects/likert-value.vo.js';
import { ConflictError } from '../../../../shared-kernel/domain/errors/conflict.error.js';
import { Answer } from './answer.entity.js';
import type { AnswerPersistence } from './answer.entity.js';

/**
 * `AnswerSheet` — aggregate root that owns the set of `Answer` entities
 * tied to a single diagnostic.
 *
 * The aggregate enforces the foundational invariant that **each
 * statement appears at most once** — duplicate `statementId` writes are
 * an upsert, not an append. Feature invariants (completeness, the
 * 48-answer requirement of RF-06) live in the `CompletenessChecker`
 * domain service, which lands with the HU that needs it (HU-10).
 *
 * The aggregate is the only entry point for mutation; consumers never
 * hold the internal Map directly. The `toPersistence` method emits
 * the rows the repository upserts; `fromPersistence` rehydrates from
 * the rows it reads.
 */
export class AnswerSheet {
  private constructor(
    public readonly diagnosticId: Uuid,
    private readonly answersByStatement: Map<string, Answer>,
  ) {}

  /** Empty sheet for a new diagnostic. */
  static create(diagnosticId: Uuid): AnswerSheet {
    return new AnswerSheet(diagnosticId, new Map());
  }

  /** Hydrate from the row set returned by the repository. */
  static fromPersistence(
    diagnosticId: Uuid,
    rows: readonly AnswerPersistence[],
  ): AnswerSheet {
    const map = new Map<string, Answer>();
    for (const row of rows) {
      const answer = Answer.fromPersistence(row);
      if (map.has(answer.statementId.value)) {
        // Defensive: the DB enforces UNIQUE(id_diagnostico, id_afirmacion)
        // so this should be unreachable. If it ever fires, it means
        // someone bypassed the constraint.
        throw new ConflictError(
          `Duplicate answer for statement ${answer.statementId.value}`,
          {
            diagnosticId: diagnosticId.value,
            statementId: answer.statementId.value,
          },
        );
      }
      map.set(answer.statementId.value, answer);
    }
    return new AnswerSheet(diagnosticId, map);
  }

  /**
   * Set or replace the answer for `statementId`. Returns the aggregate
   * so callers can chain — the aggregate mutates in-place because the
   * Map is owned by this instance.
   */
  setAnswer(statementId: Uuid, value: LikertValue): AnswerSheet {
    const existing = this.answersByStatement.get(statementId.value);
    const next = existing
      ? existing.withValue(value)
      : Answer.create(statementId, value);
    this.answersByStatement.set(statementId.value, next);
    return this;
  }

  /** Lookup by statement id; `undefined` if not yet answered. */
  getAnswer(statementId: Uuid): Answer | undefined {
    return this.answersByStatement.get(statementId.value);
  }

  /** Total number of answered statements. */
  get answeredCount(): number {
    return this.answersByStatement.size;
  }

  /** Read-only iterable over the answers, in insertion order. */
  answers(): readonly Answer[] {
    return [...this.answersByStatement.values()];
  }

  /** Persistence snapshot. The repository decides insert vs upsert. */
  toPersistence(): AnswerPersistence[] {
    return [...this.answersByStatement.values()].map((a) => ({
      id: a.id.value,
      statementId: a.statementId.value,
      value: a.value.value,
    }));
  }
}
