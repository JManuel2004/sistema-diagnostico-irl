import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ImbalanceRepositoryPort } from '../../domain/ports/imbalance.repository.port.js';
import {
  ImbalanceResult,
  type ImbalanceClassification,
} from '../../domain/value-objects/imbalance-result.vo.js';
import { ImbalanceAnalysisOrm } from './imbalance-analysis.orm-entity.js';
import { DimensionPairOrm } from '../../../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension-pair.orm-entity.js';

@Injectable()
export class TypeOrmImbalanceRepository implements ImbalanceRepositoryPort {
  constructor(
    @InjectRepository(ImbalanceAnalysisOrm)
    private readonly orm: Repository<ImbalanceAnalysisOrm>,
    @InjectRepository(DimensionPairOrm)
    private readonly pairs: Repository<DimensionPairOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<ImbalanceResult[]> {
    const rows = await this.orm.find({
      where: { idDiagnostico: diagnosticId },
      order: { idPair: 'ASC' },
    });
    if (rows.length === 0) return [];

    const pairRows = await this.pairs.find();
    const pairById = new Map(pairRows.map((p) => [p.idPair, p] as const));

    const results: ImbalanceResult[] = [];
    for (const row of rows) {
      const pair = pairById.get(row.idPair);
      if (!pair) continue;
      const [leftCode = '', rightCode = ''] = pair.pairCode.split('-');
      results.push(
        ImbalanceResult.fromPersistence({
          pairId: row.idPair,
          leftCode,
          rightCode,
          difference: row.levelDifference,
          classification: row.classification as ImbalanceClassification,
        }),
      );
    }
    return results;
  }

  async save(diagnosticId: string, results: readonly ImbalanceResult[]): Promise<void> {
    const rows = results.map((r) => ({
      idDiagnostico: diagnosticId,
      idPair: r.pairId,
      levelDifference: r.difference,
      classification: r.classification,
    }));

    await this.orm
      .createQueryBuilder()
      .insert()
      .into(ImbalanceAnalysisOrm)
      .values(rows)
      .orUpdate(['level_difference', 'classification'], ['id_diagnostico', 'id_pair'])
      .execute();
  }
}
