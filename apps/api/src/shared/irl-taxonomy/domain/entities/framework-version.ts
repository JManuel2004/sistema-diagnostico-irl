/**
 * A published version of the KTH IRL framework content: the questionnaire
 * statements and the conversion table (SA-06) that belong to it.
 *
 * A diagnostic is answered and computed with one version, the one current
 * when it started; published content is never rewritten, a change is a new
 * version. The current version is the latest published.
 */
export interface FrameworkVersionPersistence {
  readonly id: number;
  readonly code: string;
  readonly publishedAt: Date;
}

export class FrameworkVersion {
  private constructor(
    public readonly id: number,
    public readonly code: string,
    public readonly publishedAt: Date,
  ) {}

  static fromPersistence(row: FrameworkVersionPersistence): FrameworkVersion {
    return new FrameworkVersion(row.id, row.code, row.publishedAt);
  }
}
