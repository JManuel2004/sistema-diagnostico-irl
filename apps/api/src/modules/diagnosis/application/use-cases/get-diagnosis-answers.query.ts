import type { DiagnosticAnswers, DimensionAnswers } from '@innlab/contracts';
import type { TaxonomyRepositoryPort } from '../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';
import type { AnswerSheetRepositoryPort } from '../../domain/repositories/answer-sheet.repository.port.js';
import type { DiagnosisRepositoryPort } from '../../domain/repositories/diagnosis.repository.port.js';
import type { StatementCatalogPort } from '../../domain/repositories/statement-catalog.port.js';
import { findOwnDiagnosis } from './find-own-diagnosis.js';

export interface GetDiagnosisAnswersQueryInput {
  diagnosticId: string;
  /** The caller: someone else's diagnostic is answered as missing. */
  userId: string;
}

/**
 * Exported read query: what the user answered, statement by statement,
 * grouped by dimension in the framework's order — the statements of the
 * diagnostic's own framework version, with the saved value and
 * justification. `reporting/` reads it for the full report (HU-23).
 *
 * A statement with no saved answer is left out: before processing there is
 * none, and the report is only gathered once the profile exists.
 */
export class GetDiagnosisAnswersQuery {
  constructor(
    private readonly diagnoses: DiagnosisRepositoryPort,
    private readonly answerSheets: AnswerSheetRepositoryPort,
    private readonly statements: StatementCatalogPort,
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async execute(
    query: GetDiagnosisAnswersQueryInput,
  ): Promise<Result<DiagnosticAnswers, NotFoundError>> {
    const own = await findOwnDiagnosis(
      this.diagnoses,
      query.diagnosticId,
      query.userId,
    );
    if (!own.ok) return own;

    const [sheet, statements, dimensions] = await Promise.all([
      this.answerSheets.findByDiagnosticId(query.diagnosticId),
      this.statements.findStatements(own.value.frameworkVersionId),
      this.taxonomy.findAllDimensions(),
    ]);

    const byDimension: DimensionAnswers[] = [...dimensions]
      .sort((a, b) => a.sequence - b.sequence)
      .map((dimension) => ({
        dimensionCode: dimension.code.value,
        name: dimension.name,
        answers: statements
          .filter((s) => s.dimensionCode.value === dimension.code.value)
          .sort((a, b) => a.sequence - b.sequence)
          .flatMap((s) => {
            const answer = sheet?.getAnswer(s.id);
            if (!answer) return [];
            return [
              {
                statementId: s.id,
                sequence: s.sequence,
                text: s.text,
                value: answer.value.value,
                justification: answer.justification,
              },
            ];
          }),
      }));

    return Result.ok({
      diagnosticId: query.diagnosticId,
      dimensions: byDimension,
    });
  }
}
