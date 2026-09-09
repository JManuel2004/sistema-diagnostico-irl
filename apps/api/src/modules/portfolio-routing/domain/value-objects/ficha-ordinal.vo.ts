import type { DimensionCode } from '@innlab/contracts';

/**
 * La ficha de un servicio: qué banda de madurez atiende, en qué etapas
 * encaja, y con qué intensidad ordinal aborda cada dimensión IRL.
 *
 * `intensidades` guarda etiquetas, no números. La traducción a valores
 * ocurre en tiempo de consulta (`OrdinalTranslatorService`) y no al
 * publicar: precalcularla congelaría la ficha contra una calibración
 * concreta y rompería la posibilidad de reinterpretar una versión
 * antigua con su propia escala.
 */
export interface FichaOrdinal {
  readonly idServicio: number;
  readonly nombreServicio: string;
  readonly nivelMin: number;
  readonly nivelMax: number;
  readonly etapasPertinentes: readonly string[];
  readonly intensidades: ReadonlyMap<DimensionCode, string>;
}

/** La misma ficha con las etiquetas ya resueltas a valores numéricos. */
export interface FichaNumerica {
  readonly idServicio: number;
  readonly nombreServicio: string;
  readonly nivelMin: number;
  readonly nivelMax: number;
  readonly etapasPertinentes: readonly string[];
  readonly intensidades: ReadonlyMap<DimensionCode, number>;
  /** Etiqueta original por dimensión, para poder explicar sin números. */
  readonly etiquetas: ReadonlyMap<DimensionCode, string>;
}
