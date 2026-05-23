import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MaturityProfileRepositoryPort } from '../../domain/ports/maturity-profile.repository.port.js';
import { MaturityProfile } from '../../domain/entities/maturity-profile.aggregate.js';
import { MaturityProfileCalculationError } from '../../domain/errors/maturity-profile-calculation.error.js';
import { ResultadoDimensionOrm } from './resultado-dimension.orm-entity.js';
import { DimensionOrm } from '../../../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';

@Injectable()
export class TypeOrmMaturityProfileRepository implements MaturityProfileRepositoryPort {
  constructor(
    @InjectRepository(ResultadoDimensionOrm)
    private readonly orm: Repository<ResultadoDimensionOrm>,
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
  ) {}

  async save(profile: MaturityProfile): Promise<void> {
    const snapshot = profile.toPersistence();
    const idByCode = await this.loadDimensionIdByCode();

    const rows = snapshot.dimensionResults.map((r) => {
      const idDimension = idByCode.get(r.dimensionCode);
      if (idDimension === undefined) {
        throw new MaturityProfileCalculationError(
          `Cannot map dimensionCode '${r.dimensionCode}' to id_dimension`,
          { dimensionCode: r.dimensionCode },
        );
      }
      return {
        idDiagnostico: snapshot.diagnosticId,
        idDimension,
        promedioLikert: r.averageLikert,
        nivelIrl: r.irlLevel,
        enEstadoCritico: false,
        esCuelloBotella: false,
        fechaCalculo: snapshot.computedAt,
      };
    });

    await this.orm
      .createQueryBuilder()
      .insert()
      .into(ResultadoDimensionOrm)
      .values(rows)
      .orUpdate(
        ['promedio_likert', 'nivel_irl', 'fecha_calculo'],
        ['id_diagnostico', 'id_dimension'],
      )
      .execute();
  }

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<MaturityProfile | null> {
    const rows = await this.orm.find({
      where: { idDiagnostico: diagnosticId },
    });
    if (rows.length === 0) return null;

    const codeById = await this.loadDimensionCodeById();

    return MaturityProfile.fromPersistence({
      diagnosticId,
      computedAt: rows[0].fechaCalculo,
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
          averageLikert: row.promedioLikert,
          irlLevel: row.nivelIrl,
        };
      }),
    });
  }

  private async loadDimensionIdByCode(): Promise<ReadonlyMap<string, number>> {
    const rows = await this.dimensions.find();
    return new Map(rows.map((d) => [d.codigo, d.idDimension] as const));
  }

  private async loadDimensionCodeById(): Promise<ReadonlyMap<number, string>> {
    const rows = await this.dimensions.find();
    return new Map(rows.map((d) => [d.idDimension, d.codigo] as const));
  }
}
