import type { AnswerSheet } from '../entities/answer-sheet.aggregate.js';

/**
 * Repository port for `AnswerSheet` aggregates.
 *
 * One `AnswerSheet` per `Diagnostico`. The aggregate is loaded by
 * `diagnosticId` (never by `answerId`) because external modules know
 * the diagnostic, not the synthetic answer rows.
 *
 * `save(sheet)` upserts the entire row set in a single transaction —
 * the unique constraint `(id_diagnostico, id_afirmacion)` from the
 * initial migration is the primary key for upsert semantics. The
 * adapter (`TypeOrmAnswerSheetRepository`) decides whether to replace
 * or merge per-call; see its docstring for the policy.
 */
export const ANSWER_SHEET_REPOSITORY = Symbol('ANSWER_SHEET_REPOSITORY');

export interface AnswerSheetRepositoryPort {
  findByDiagnosticId(diagnosticId: string): Promise<AnswerSheet | null>;
  save(sheet: AnswerSheet): Promise<void>;
}
