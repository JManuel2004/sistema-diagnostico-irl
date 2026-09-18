/**
 * `CompletenessReport` — value object that captures the outcome of a
 * completeness check against an `AnswerSheet` (RF-06).
 *
 * The Stage-1 shape is foundational: the data carrier and a typed view.
 * The actual `CompletenessChecker` domain service that produces a
 * report — including the rule that there must be exactly 48 answers,
 * 8 per dimension — is feature logic and lands with HU-10.
 *
 * Each `MissingStatement` identifies the gap with the same `(dimension
 * code, sequence-within-dimension)` shape the frontend uses to navigate
 * back to the gap from `IncompleteSubmitDialog`.
 */
export interface MissingStatement {
  readonly dimensionCode: string;
  readonly sequence: number;
  readonly statementId: string;
}

export class CompletenessReport {
  private constructor(
    public readonly answeredCount: number,
    public readonly expectedCount: number,
    public readonly missing: readonly MissingStatement[],
  ) {}

  static of(
    answeredCount: number,
    expectedCount: number,
    missing: readonly MissingStatement[],
  ): CompletenessReport {
    return new CompletenessReport(answeredCount, expectedCount, missing);
  }

  /** True iff every expected statement has an answer. */
  get isComplete(): boolean {
    return (
      this.missing.length === 0 && this.answeredCount === this.expectedCount
    );
  }
}
