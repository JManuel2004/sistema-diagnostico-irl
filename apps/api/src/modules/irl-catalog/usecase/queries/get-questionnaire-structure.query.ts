import type { IrlCatalogRepositoryPort } from '../../domain/ports/irl-catalog.repository.port.js';
import type { QuestionnaireStructure } from '@innlab/contracts';

// RF-05 — KTH Innovation Readiness Level framework version; anchors the
// client-side cache key so a framework update can be detected client-side.
const VERSION_MARCO = 'KTH-IRL-1.0';

/**
 * `GetQuestionnaireStructureQuery` — read-only query that assembles the
 * 6 × 8 questionnaire structure from the catalog.
 *
 * Fetches all dimensions and all statements in parallel, then groups
 * statements by dimension so the caller never has to join them. The
 * result shape matches `QuestionnaireStructure` from `@innlab/contracts`.
 *
 * This is a query (not a command): it has no side-effects and is
 * idempotent. The catalog is immutable at runtime so the result is
 * suitable for an infinite-stale React Query cache on the client.
 *
 * No NestJS decorators — constructed via factory provider in
 * `IrlCatalogModule` to keep the application layer framework-free.
 */
export class GetQuestionnaireStructureQuery {
  constructor(private readonly repository: IrlCatalogRepositoryPort) {}

  async execute(): Promise<QuestionnaireStructure> {
    const [dimensions, statements] = await Promise.all([
      this.repository.findAllDimensions(),
      this.repository.findAllStatements(),
    ]);

    // Index statements by dimension code for O(1) lookup during map.
    const byCode = new Map<string, typeof statements>();
    for (const s of statements) {
      const code = s.dimensionCode.value;
      const bucket = byCode.get(code) ?? [];
      bucket.push(s);
      byCode.set(code, bucket);
    }

    return {
      versionMarco: VERSION_MARCO,
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
    };
  }
}
