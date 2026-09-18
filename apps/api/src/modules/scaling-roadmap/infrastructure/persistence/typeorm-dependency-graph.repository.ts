import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type {
  DependencyEdgeSnapshot,
  DependencyGraphRepositoryPort,
  DimensionMinimumSnapshot,
} from '../../domain/ports/dependency-graph.repository.port.js';
import { DimensionDependencyOrm } from './dimension-dependency.orm-entity.js';
import { DimensionOrm } from '../../../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension.orm-entity.js';

/**
 * Read adapter for the graph over `irl_catalog`.
 *
 * Translates the integer ids of `dimension_dependency` into dimension
 * codes before crossing the domain boundary: the engine reasons in
 * `TRL`/`CRL`/…, never in primary keys, which are IDENTITY and not
 * stable across environments.
 */
@Injectable()
export class TypeOrmDependencyGraphRepository
  implements DependencyGraphRepositoryPort
{
  constructor(
    @InjectRepository(DimensionDependencyOrm)
    private readonly dependencies: Repository<DimensionDependencyOrm>,
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
  ) {}

  async findActiveEdges(): Promise<DependencyEdgeSnapshot[]> {
    const [rows, codeById] = await Promise.all([
      // Active ones only: a disabled edge stays in the table but takes
      // no part in the computation.
      this.dependencies.find({ where: { isActive: true } }),
      this.codeById(),
    ]);

    return rows.flatMap((f) => {
      const source = codeById.get(f.idDimensionSource);
      const target = codeById.get(f.idDimensionTarget);
      // The FKs guarantee both exist; the filter is defence in depth
      // against an orphan row after a restore.
      if (!source || !target) return [];
      return [
        {
          source,
          target,
          minimumRequiredLevel: f.minimumRequiredLevel,
        },
      ];
    });
  }

  async findExpectedMinimums(): Promise<DimensionMinimumSnapshot[]> {
    const rows = await this.dimensions.find({ order: { sequence: 'ASC' } });
    return rows.map((d) => ({
      dimension: d.code as DimensionCode,
      minimumExpectedLevel: d.minimumExpectedLevel,
    }));
  }

  private async codeById(): Promise<ReadonlyMap<number, DimensionCode>> {
    const rows = await this.dimensions.find();
    return new Map(
      rows.map((d) => [d.idDimension, d.code as DimensionCode] as const),
    );
  }
}
