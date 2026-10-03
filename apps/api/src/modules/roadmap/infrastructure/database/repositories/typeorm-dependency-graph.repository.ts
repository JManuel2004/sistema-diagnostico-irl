import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type {
  DependencyEdgeSnapshot,
  DependencyGraphRepositoryPort,
  DimensionMinimumSnapshot,
} from '../../../domain/repositories/dependency-graph.repository.port.js';
import { DimensionDependencyOrm } from '../orm-entities/dimension-dependency.orm-entity.js';
import { RoadmapParametersOrm } from '../orm-entities/roadmap-parameters.orm-entity.js';
import type { RoadmapParameters } from '../../../domain/value-objects/roadmap-parameters.vo.js';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

/**
 * Read adapter for the graph over `irl_catalog`.
 *
 * Translates the integer ids of `dimension_dependency` into dimension
 * codes before crossing the domain boundary: the engine reasons in
 * `TRL`/`CRL`/…, never in primary keys, which are IDENTITY and not
 * stable across environments.
 *
 * Reads dimensions through `TaxonomyRepositoryPort` rather than
 * `DimensionOrm` directly — `shared/irl-taxonomy/` is its own bounded
 * context, not a table any module can reach into.
 */
@Injectable()
export class TypeOrmDependencyGraphRepository implements DependencyGraphRepositoryPort {
  constructor(
    @InjectRepository(DimensionDependencyOrm)
    private readonly dependencies: Repository<DimensionDependencyOrm>,
    @InjectRepository(RoadmapParametersOrm)
    private readonly parameters: Repository<RoadmapParametersOrm>,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async findEdges(): Promise<DependencyEdgeSnapshot[]> {
    const [rows, codeById] = await Promise.all([
      this.dependencies.find(),
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
    const dimensions = await this.taxonomy.findAllDimensions();
    return dimensions.map((d) => ({
      dimension: d.code.value,
      minimumExpectedLevel: d.minimumExpectedLevel,
    }));
  }

  async findParameters(): Promise<RoadmapParameters | null> {
    const [row] = await this.parameters.find({ take: 1 });
    return row
      ? {
          maxLevelsPerPhase: row.maxLevelsPerPhase,
          balanceTolerance: row.balanceTolerance,
        }
      : null;
  }

  private async codeById(): Promise<ReadonlyMap<number, DimensionCode>> {
    const dimensions = await this.taxonomy.findAllDimensions();
    return new Map(dimensions.map((d) => [d.id, d.code.value] as const));
  }
}
