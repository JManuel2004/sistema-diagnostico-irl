import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ImbalanceRepositoryPort } from '../../domain/ports/imbalance.repository.port.js';
import type { ImbalanceResult } from '../../domain/value-objects/imbalance-result.vo.js';
import { AnalisisDesequilibrioOrm } from './analisis-desequilibrio.orm-entity.js';

@Injectable()
export class TypeOrmImbalanceRepository implements ImbalanceRepositoryPort {
  constructor(
    @InjectRepository(AnalisisDesequilibrioOrm)
    private readonly orm: Repository<AnalisisDesequilibrioOrm>,
  ) {}

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
