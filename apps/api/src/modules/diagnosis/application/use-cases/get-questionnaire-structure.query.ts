import type { TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import type { StatementCatalogPort } from '../../domain/repositories/statement-catalog.port.js';
import type { QuestionnaireStructure } from '@innlab/contracts';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

/**
 * `GetQuestionnaireStructureQuery` — read-only query that assembles the
 * 6 × 8 questionnaire structure from the catalog.
 *
 * Fetches all dimensions (`shared/irl-taxonomy/`) and all statements
 * (`diagnosis/`'s own `StatementCatalogPort`) in parallel, then groups
 * statements by dimension so the caller never has to join them. The
 * result shape matches `QuestionnaireStructure` from `@innlab/contracts`.
 *
 * Two ports instead of one: dimensions are shared vocabulary owned by
 * `shared/irl-taxonomy/`, statements are `diagnosis/`'s own content —
 * this query is the one place in the system that needs both at once to
 * render the form, so it depends on both ports directly rather than
 * either module depending on the other.
 *
 * This is a query (not a command): it has no side-effects and is
 * idempotent. The catalog is immutable at runtime so the result is
 * suitable for an infinite-stale React Query cache on the client.
 *
 * No NestJS decorators — constructed via factory provider in
 * `DiagnosisModule` to keep the application layer framework-free.
 */
export class GetQuestionnaireStructureQuery {
  constructor(
    private readonly taxonomy: TaxonomyRepositoryPort,
    private readonly statementCatalog: StatementCatalogPort,
  ) {}

  /**
   * The questionnaire of a framework version — the diagnostic's, so its
   * answers match its statements — or of the current one when no version
   * is given.
   */
  async execute(
    versionCode?: string,
  ): Promise<Result<QuestionnaireStructure, NotFoundError>> {
    const version = versionCode
      ? await this.taxonomy.findFrameworkVersionByCode(versionCode)
      : await this.taxonomy.findCurrentFrameworkVersion();
    if (!version) {
      return Result.err(new NotFoundError('Framework version', versionCode ?? 'current'));
    }
    const [dimensions, statements] = await Promise.all([
      this.taxonomy.findAllDimensions(),
      this.statementCatalog.findStatements(version.id),
    ]);

    // Index statements by dimension code for O(1) lookup during map.
    const byCode = new Map<string, typeof statements>();
    for (const s of statements) {
      const code = s.dimensionCode.value;
      const bucket = byCode.get(code) ?? [];
      bucket.push(s);
      byCode.set(code, bucket);
    }

    return Result.ok({
      frameworkVersion: version.code,
      dimensions: dimensions.map((dim) => ({
        code: dim.code.value,
        name: dim.name,
        description: dim.description,
        sequence: dim.sequence,
        statements: (byCode.get(dim.code.value) ?? []).map((s) => ({
          id: s.id,
          dimensionCode: s.dimensionCode.value,
          sequence: s.sequence,
          text: s.text,
        })),
      })),
    });
  }
}
