import type { DimensionCode } from '@innlab/contracts';

/**
 * Puerto de lectura del grafo de dependencias.
 *
 * Solo lectura, sin métodos de escritura, igual que
 * `IrlCatalogRepositoryPort`: los catálogos no se modifican desde la
 * aplicación, se siembran.
 */
export const DEPENDENCY_GRAPH_REPOSITORY = Symbol(
  'DEPENDENCY_GRAPH_REPOSITORY',
);

/** Una arista activa del grafo, con códigos ya resueltos. */
export interface DependencyEdgeSnapshot {
  readonly origen: DimensionCode;
  readonly destino: DimensionCode;
  readonly nivelMinimoRequerido: number;
}

/** El nivel que se espera que una dimensión alcance. */
export interface DimensionMinimumSnapshot {
  readonly dimension: DimensionCode;
  readonly nivelMinimoEsperado: number;
}

export interface DependencyGraphRepositoryPort {
  /** Solo las aristas con `activa = true`. */
  findActiveEdges(): Promise<DependencyEdgeSnapshot[]>;
  /** Un mínimo por cada una de las seis dimensiones. */
  findExpectedMinimums(): Promise<DimensionMinimumSnapshot[]>;
}
