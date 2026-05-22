import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { MaturityProfileRepositoryPort } from '../../domain/ports/maturity-profile.repository.port.js';
import { MaturityProfile } from '../../domain/entities/maturity-profile.aggregate.js';
import { MaturityProfileCalculationError } from '../../domain/errors/maturity-profile-calculation.error.js';
import { ResultadoDimensionOrm } from './resultado-dimension.orm-entity.js';
import { DimensionOrm } from '../../../irl-catalog/infrastructure/persistence/entities/dimension.orm-entity.js';

/**
 * TypeORM-backed adapter for the `MaturityProfile` aggregate (RF-07).
 *
 * Mapping concern: the aggregate carries `dimensionCode` (TRL, CRL, ...)
 * but `irl_diagnostic.resultado_dimension` stores the integer FK
 * `id_dimension`. We translate both ways via a small lookup against
 * `irl_catalog.dimension`. The catalog is immutable at runtime so the
 * lookup is correct after the first migration + seed.
 *
 * Save policy: **replace-all inside a single transaction**. DELETE the
 * six prior rows (if any) and INSERT the six fresh ones atomically.
 * Failure rolls back the entire change — fulfils the DIAGIRL-34 error
 * scenario "no guarda resultados parciales".
 *
 * Booleans on insert: `en_estado_critico` and `es_cuello_botella` are
 * always `false` here. DIAGIRL-35 / DIAGIRL-38 will UPDATE them through
 * dedicated calls after the profile lands.
 */
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

    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(ResultadoDimensionOrm, {
        idDiagnostico: snapshot.diagnosticId,
      });

      const rows = snapshot.dimensionResults.map((r) => {
        const idDimension = idByCode.get(r.dimensionCode);
        if (idDimension === undefined) {
          // Should be impossible: the aggregate already validated the
          // codes. This is defense in depth if the catalog drifted
          // between the calculation and the persist.
          throw new MaturityProfileCalculationError(
            `Cannot map dimensionCode '${r.dimensionCode}' to id_dimension`,
            { dimensionCode: r.dimensionCode },
          );
        }
        return manager.create(ResultadoDimensionOrm, {
          idDiagnostico: snapshot.diagnosticId,
          idDimension,
          promedioLikert: r.averageLikert,
          nivelIrl: r.irlLevel,
          enEstadoCritico: false,
          esCuelloBotella: false,
          fechaCalculo: snapshot.computedAt,
        });
      });

      await manager.insert(ResultadoDimensionOrm, rows);
    });
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
      // All six rows share the same fecha_calculo (the use case writes
      // them in one transaction with one timestamp). Pick the first.
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

  // ───────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────

  private async loadDimensionIdByCode(): Promise<ReadonlyMap<string, number>> {
    const rows = await this.dimensions.find();
    return new Map(rows.map((d) => [d.codigo, d.idDimension] as const));
  }

  private async loadDimensionCodeById(): Promise<ReadonlyMap<number, string>> {
    const rows = await this.dimensions.find();
    return new Map(rows.map((d) => [d.idDimension, d.codigo] as const));
  }
}
