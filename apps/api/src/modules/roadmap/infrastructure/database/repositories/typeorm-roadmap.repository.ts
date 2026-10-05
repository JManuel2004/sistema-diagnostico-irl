import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RoadmapRepositoryPort } from '../../../domain/repositories/roadmap.repository.port.js';
import { ScalingRoadmap } from '../../../domain/entities/scaling-roadmap.aggregate.js';
import { Uuid } from '../../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { ScalingRoadmapOrm } from '../orm-entities/scaling-roadmap.orm-entity.js';

/**
 * Adapter of the saved roadmap.
 *
 * Rewrite policy: delete and insert inside one transaction, like the
 * recommendation. `UNIQUE (id_diagnostic)` admits a single roadmap per
 * diagnostic, so recalculating replaces it rather than piling up versions.
 *
 * Reading goes back through `ScalingRoadmap.create`, so a stored row that no
 * longer satisfies the aggregate's invariants fails loudly instead of being
 * served.
 */
@Injectable()
export class TypeOrmRoadmapRepository implements RoadmapRepositoryPort {
  constructor(
    @InjectRepository(ScalingRoadmapOrm)
    private readonly orm: Repository<ScalingRoadmapOrm>,
  ) {}

  async save(roadmap: ScalingRoadmap): Promise<void> {
    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(ScalingRoadmapOrm, {
        idDiagnostic: roadmap.diagnosticId.value,
      });
      await manager.insert(ScalingRoadmapOrm, {
        idDiagnostic: roadmap.diagnosticId.value,
        phases: [...roadmap.phases],
        finalLevels: { ...roadmap.finalLevels },
        balanced: roadmap.balanced,
        generatedAt: roadmap.generatedAt,
      });
    });
  }

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<ScalingRoadmap | null> {
    const row = await this.orm.findOne({
      where: { idDiagnostic: diagnosticId },
    });
    if (!row) return null;
    return ScalingRoadmap.create({
      diagnosticId: Uuid.create(row.idDiagnostic),
      phases: row.phases,
      finalLevels: row.finalLevels,
      balanced: row.balanced,
      generatedAt: row.generatedAt,
    });
  }
}
