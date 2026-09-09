import { Inject, Injectable } from '@nestjs/common';
import {
  MATURITY_PROFILE_REPOSITORY,
  type MaturityProfileRepositoryPort,
} from '../domain/ports/maturity-profile.repository.port.js';
import {
  IMBALANCE_REPOSITORY,
  type ImbalanceRepositoryPort,
} from '../domain/ports/imbalance.repository.port.js';
import {
  IRL_CATALOG_REPOSITORY,
  type IrlCatalogRepositoryPort,
} from '../../irl-catalog/domain/ports/irl-catalog.repository.port.js';
import { IrlCalculatorService } from '../domain/services/irl-calculator.service.js';
import { ImbalanceEvaluatorService } from '../domain/services/imbalance-evaluator.service.js';
import { MaturityProfile } from '../domain/entities/maturity-profile.aggregate.js';
import { MaturityProfileCalculationError } from '../domain/errors/maturity-profile-calculation.error.js';
import type { ImbalanceResult } from '../domain/value-objects/imbalance-result.vo.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { DimensionCode } from '../../../shared-kernel/domain/value-objects/dimension-code.js';
import { LikertValue } from '../../../shared-kernel/domain/value-objects/likert-value.vo.js';

export interface ComputeMaturityProfileCommand {
  diagnosticId: string;
  answers: { statementId: string; value: number }[];
}

@Injectable()
export class ComputeMaturityProfileUseCase {
  constructor(
    @Inject(IRL_CATALOG_REPOSITORY)
    private readonly catalog: IrlCatalogRepositoryPort,
    @Inject(MATURITY_PROFILE_REPOSITORY)
    private readonly profiles: MaturityProfileRepositoryPort,
    @Inject(IMBALANCE_REPOSITORY)
    private readonly imbalanceRepo: ImbalanceRepositoryPort,
    private readonly calculator: IrlCalculatorService,
    private readonly imbalanceEvaluator: ImbalanceEvaluatorService,
  ) {}

  async execute(
    cmd: ComputeMaturityProfileCommand,
  ): Promise<{ profile: MaturityProfile; imbalances: ImbalanceResult[] }> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    if (cmd.answers.length !== 48) {
      throw new MaturityProfileCalculationError(
        `Cannot compute profile: expected 48 answers, found ${cmd.answers.length}`,
        {
          diagnosticId: diagnosticId.value,
          answeredCount: cmd.answers.length,
        },
      );
    }

    const [statements, conversionTable, pairs] = await Promise.all([
      this.catalog.findAllStatements(),
      this.catalog.findAllConversionRanges(),
      this.catalog.findAllDimensionPairs(),
    ]);

    const dimensionByStatement = new Map<string, DimensionCode>(
      statements.map((s) => [s.id, s.dimensionCode] as const),
    );

    const answersByDimension = new Map<DimensionCode, LikertValue[]>();
    for (const answer of cmd.answers) {
      const dimension = dimensionByStatement.get(answer.statementId);
      if (!dimension) {
        throw new MaturityProfileCalculationError(
          `Answer references unknown statement ${answer.statementId}`,
          { statementId: answer.statementId },
        );
      }
      const existingKey = [...answersByDimension.keys()].find((k) =>
        k.equals(dimension),
      );
      const key = existingKey ?? dimension;
      const list = answersByDimension.get(key) ?? [];
      list.push(LikertValue.create(answer.value));
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

    const levelByCode = new Map<string, number>(
      dimensionResults.map((r) => [r.dimensionCode.value, r.irlLevel.value]),
    );
    const imbalances = this.imbalanceEvaluator.evaluate(levelByCode, pairs);

    await Promise.all([
      this.profiles.save(profile),
      this.imbalanceRepo.save(diagnosticId.value, imbalances),
    ]);

    return { profile, imbalances };
  }
}
