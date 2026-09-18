import type { DimensionCode } from '@innlab/contracts';

/**
 * La ficha de un servicio: qué banda de madurez atiende, en qué etapas
 * encaja, y con qué intensidad ordinal aborda cada dimensión IRL.
 *
 * `intensities` guarda etiquetas, no números. La traducción a valores
 * ocurre en tiempo de consulta (`OrdinalTranslatorService`) y no al
 * publicar: precalcularla congelaría la ficha contra una calibración
 * concreta y rompería la posibilidad de reinterpretar una versión
 * antigua con su propia escala.
 */
export interface OrdinalProfile {
  readonly idService: number;
  readonly serviceName: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly relevantStages: readonly string[];
  readonly intensities: ReadonlyMap<DimensionCode, string>;
}

/** La misma ficha con las etiquetas ya resueltas a valores numéricos. */
export interface NumericProfile {
  readonly idService: number;
  readonly serviceName: string;
  readonly minLevel: number;
  readonly maxLevel: number;
  readonly relevantStages: readonly string[];
  readonly intensities: ReadonlyMap<DimensionCode, number>;
  /** Etiqueta original por dimensión, para poder explicar sin números. */
  readonly labels: ReadonlyMap<DimensionCode, string>;
}
