import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MaturityProfileRepositoryPort } from '../../../domain/repositories/maturity-profile.repository.port.js';
import { MaturityProfile } from '../../../domain/entities/maturity-profile.aggregate.js';
import { MaturityProfileCalculationError } from '../../../domain/exceptions/maturity-profile-calculation.error.js';
import { DimensionResultOrm } from '../orm-entities/dimension-result.orm-entity.js';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import { upsertColumns } from '../../../../../shared/kernel/infrastructure/database/upsert-columns.js';

/** Unique constraint `uq_dimension_result_diag_dim` the upsert conflicts on. */
const CONFLICT = ['id_diagnostic', 'id_dimension'] as const;

@Injectable()
export class TypeOrmMaturityProfileRepository implements MaturityProfileRepositoryPort {
  constructor(
    @InjectRepository(DimensionResultOrm)
    private readonly orm: Repository<DimensionResultOrm>,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async save(profile: MaturityProfile): Promise<void> {
    const snapshot = profile.toPersistence();
    const catalog = await this.taxonomy.findAllDimensions();
    const idByCode = new Map<string, number>(catalog.map((d) => [d.code.value, d.id]));
    // RF-13: critical state needs both a gap and a dimension the framework
    // marks as susceptible (`is_critical_dimension`).
    const criticalCodes = new Set<string>(
      profile
        .criticalState(
          new Set(
            catalog.filter((d) => d.isCriticalDimension).map((d) => d.code.value),
          ),
        )
        .dimensions.map((d) => d.dimensionCode.value),
    );

    const rows = snapshot.dimensionResults.map((r) => {
      const idDimension = idByCode.get(r.dimensionCode);
      if (idDimension === undefined) {
        throw new MaturityProfileCalculationError(
          `Cannot map dimensionCode '${r.dimensionCode}' to id_dimension`,
          { dimensionCode: r.dimensionCode },
        );
      }
      return {
        diagnosticId: snapshot.diagnosticId,
        idDimension,
        likertAverage: r.averageLikert,
        irlLevel: r.irlLevel,
        inCriticalState: criticalCodes.has(r.dimensionCode),
        computedAt: snapshot.computedAt,
      };
    });

    await this.orm
      .createQueryBuilder()
      .insert()
      .into(DimensionResultOrm)
      .values(rows)
      .orUpdate(upsertColumns(this.orm, CONFLICT), [...CONFLICT])
      .execute();
  }

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<MaturityProfile | null> {
    const rows = await this.orm.find({
      where: { diagnosticId: diagnosticId },
    });
    if (rows.length === 0) return null;

    const codeById = await this.loadDimensionCodeById();

    return MaturityProfile.fromPersistence({
      diagnosticId,
      computedAt: rows[0].computedAt,
      dimensionResults: rows.map((row) => {
        const code = codeById.get(row.idDimension);
        if (code === undefined) {
          throw new MaturityProfileCalculationError(
            `Cannot map id_dimension ${row.idDimension} to a code`,
            { idDimension: row.idDimension },
          );
        }
        return {
          dimensionCode: code,
          averageLikert: row.likertAverage,
          irlLevel: row.irlLevel,
        };
      }),
    });
  }

  private async loadDimensionCodeById(): Promise<ReadonlyMap<number, string>> {
    const dimensions = await this.taxonomy.findAllDimensions();
    return new Map(dimensions.map((d) => [d.id, d.code.value] as const));
  }
}
