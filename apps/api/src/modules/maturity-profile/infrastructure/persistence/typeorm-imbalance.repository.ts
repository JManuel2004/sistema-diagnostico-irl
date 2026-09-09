import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ImbalanceRepositoryPort } from '../../domain/ports/imbalance.repository.port.js';
import {
  ImbalanceResult,
  type ImbalanceClassification,
} from '../../domain/value-objects/imbalance-result.vo.js';
import { AnalisisDesequilibrioOrm } from './analisis-desequilibrio.orm-entity.js';
import { ParDimensionOrm } from '../../../irl-catalog/infrastructure/persistence/entities/par-dimension.orm-entity.js';

@Injectable()
export class TypeOrmImbalanceRepository implements ImbalanceRepositoryPort {
  constructor(
    @InjectRepository(AnalisisDesequilibrioOrm)
    private readonly orm: Repository<AnalisisDesequilibrioOrm>,
    @InjectRepository(ParDimensionOrm)
    private readonly pairs: Repository<ParDimensionOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<ImbalanceResult[]> {
    const rows = await this.orm.find({
      where: { idDiagnostico: diagnosticId },
      order: { idPar: 'ASC' },
    });
    if (rows.length === 0) return [];

    const pairRows = await this.pairs.find();
    const pairById = new Map(pairRows.map((p) => [p.idPar, p] as const));

    const results: ImbalanceResult[] = [];
    for (const row of rows) {
      const pair = pairById.get(row.idPar);
      if (!pair) continue;
      const [leftCode = '', rightCode = ''] = pair.codigoPar.split('-');
      results.push(
        ImbalanceResult.fromPersistence({
          pairId: row.idPar,
          leftCode,
          rightCode,
          difference: row.diferenciaNiveles,
          classification: row.clasificacion as ImbalanceClassification,
        }),
      );
    }
    return results;
  }

  async save(diagnosticId: string, results: readonly ImbalanceResult[]): Promise<void> {
    const rows = results.map((r) => ({
      idDiagnostico: diagnosticId,
      idPar: r.pairId,
      diferenciaNiveles: r.difference,
      clasificacion: r.classification,
    }));

    await this.orm
      .createQueryBuilder()
      .insert()
      .into(AnalisisDesequilibrioOrm)
      .values(rows)
      .orUpdate(['diferencia_niveles', 'clasificacion'], ['id_diagnostico', 'id_par'])
      .execute();
  }
}
