import type { DimensionCode } from '@innlab/contracts';
import type { RoadmapParameters } from '../value-objects/roadmap-parameters.vo.js';

/**
 * Read port for the dependency graph.
 *
 * Read-only, with no write methods, just like `IrlCatalogRepositoryPort`:
 * catalogs are not modified from the application, they are seeded.
 */
export const DEPENDENCY_GRAPH_REPOSITORY = Symbol(
  'DEPENDENCY_GRAPH_REPOSITORY',
);

/** An edge of the graph, with its codes already resolved. */
export interface DependencyEdgeSnapshot {
  readonly source: DimensionCode;
  readonly target: DimensionCode;
  readonly minimumRequiredLevel: number;
}

/** The level a dimension is expected to reach. */
export interface DimensionMinimumSnapshot {
  readonly dimension: DimensionCode;
  readonly minimumExpectedLevel: number;
}

export interface DependencyGraphRepositoryPort {
  /** Every edge of the graph. */
  findEdges(): Promise<DependencyEdgeSnapshot[]>;
  /** One minimum for each of the six dimensions. */
  findExpectedMinimums(): Promise<DimensionMinimumSnapshot[]>;
  /** How the route is paced and closed, or `null` if not seeded. */
  findParameters(): Promise<RoadmapParameters | null>;
}
