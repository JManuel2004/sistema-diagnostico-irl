import { Inject, Injectable } from '@nestjs/common';
import {
  ANSWER_SHEET_REPOSITORY,
  type AnswerSheetRepositoryPort,
} from '../../questionnaire/domain/ports/answer-sheet.repository.port.js';
import {
  IRL_CATALOG_REPOSITORY,
  type IrlCatalogRepositoryPort,
} from '../../irl-catalog/domain/ports/irl-catalog.repository.port.js';
import {
  MATURITY_PROFILE_REPOSITORY,
  type MaturityProfileRepositoryPort,
} from '../domain/ports/maturity-profile.repository.port.js';
import { IrlCalculatorService } from '../domain/services/irl-calculator.service.js';
import { MaturityProfile } from '../domain/entities/maturity-profile.aggregate.js';
import { MaturityProfileCalculationError } from '../domain/errors/maturity-profile-calculation.error.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { DimensionCode } from '../../../shared-kernel/domain/value-objects/dimension-code.js';
import { LikertValue } from '../../../shared-kernel/domain/value-objects/likert-value.vo.js';

/**
 * Command for `ComputeMaturityProfileUseCase`.
 */
export interface ComputeMaturityProfileCommand {
  diagnosticId: string;
}

/**
 * Application use case for DIAGIRL-34 — "Obtener niveles IRL por dimensión".
 *
 * Orchestrates the read sources and the pure calculator without crossing
 * write boundaries of other bounded contexts. The diagnostic state
 * transition (CUESTIONARIO_COMPLETO → PERFIL_GENERADO) is the
 * orchestrator's responsibility and lives in `DiagnosticModule`; this
 * use case only ensures the profile rows land in
 * `irl_diagnostic.resultado_dimension`.
 *
 * Pipeline:
 *   1. Load the submitted answers (`AnswerSheetRepositoryPort.findByDiagnosticId`).
 *   2. Load the catalog statements + conversion table from the
 *      `IrlCatalogRepositoryPort`.
 *   3. Group the answers by `DimensionCode` using the statement →
 *      dimension index.
 *   4. Call `IrlCalculatorService.calculate(...)` (pure).
 *   5. Build the `MaturityProfile` aggregate.
 *   6. Persist via `MaturityProfileRepositoryPort.save(...)` (atomic).
 *
 * Failure handling: any step that fails throws — the calculator service
 * raises `MaturityProfileCalculationError` for domain-level problems,
 * the repository raises it (or lets it propagate from TypeORM) for
 * persistence problems. The save transaction guarantees no partial
 * profile reaches the database (acceptance criterion of DIAGIRL-34).
 */
@Injectable()
export class ComputeMaturityProfileUseCase {
  constructor(
    @Inject(ANSWER_SHEET_REPOSITORY)
    private readonly answerSheets: AnswerSheetRepositoryPort,
    @Inject(IRL_CATALOG_REPOSITORY)
    private readonly catalog: IrlCatalogRepositoryPort,
    @Inject(MATURITY_PROFILE_REPOSITORY)
    private readonly profiles: MaturityProfileRepositoryPort,
    private readonly calculator: IrlCalculatorService,
  ) {}

  async execute(cmd: ComputeMaturityProfileCommand): Promise<MaturityProfile> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    const sheet = await this.answerSheets.findByDiagnosticId(
      diagnosticId.value,
    );
    if (!sheet) {
      throw new MaturityProfileCalculationError(
        `No answer sheet found for diagnostic ${diagnosticId.value}`,
        { diagnosticId: diagnosticId.value },
      );
    }
    if (sheet.answeredCount !== 48) {
      throw new MaturityProfileCalculationError(
        `Cannot compute profile: expected 48 answers, found ${sheet.answeredCount}`,
        {
          diagnosticId: diagnosticId.value,
          answeredCount: sheet.answeredCount,
        },
      );
    }

    const [statements, conversionTable] = await Promise.all([
      this.catalog.findAllStatements(),
      this.catalog.findAllConversionRanges(),
    ]);

    const dimensionByStatement = new Map<string, DimensionCode>(
      statements.map((s) => [s.id, s.dimensionCode] as const),
    );

    // Group the 48 answers by their dimension.
    const answersByDimension = new Map<DimensionCode, LikertValue[]>();
    for (const answer of sheet.answers()) {
      const dimension = dimensionByStatement.get(answer.statementId);
      if (!dimension) {
        throw new MaturityProfileCalculationError(
          `Answer references unknown statement ${answer.statementId}`,
          { statementId: answer.statementId },
        );
      }
      // The Map key is the DimensionCode VO instance — group by `value`
      // string to avoid creating 6 separate keys for 6 distinct VOs.
      const existingKey = [...answersByDimension.keys()].find((k) =>
        k.equals(dimension),
      );
      const key = existingKey ?? dimension;
      const list = answersByDimension.get(key) ?? [];
      list.push(answer.value);
      answersByDimension.set(key, list);
    }

    const dimensionResults = this.calculator.calculate(
      answersByDimension,
      conversionTable,
    );

    const profile = MaturityProfile.create({
      diagnosticId,
      computedAt: new Date(),
      dimensionResults,
    });

    await this.profiles.save(profile);

    return profile;
  }
}
