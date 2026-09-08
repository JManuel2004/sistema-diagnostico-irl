import { DomainError } from '../../../../shared-kernel/domain/errors/domain-error.js';

/**
 * Fallo al construir el roadmap de escalamiento.
 *
 * Se mapea a **500**, no al 400 por defecto de `DomainError`: las causas
 * posibles —grafo con ciclo, mínimos incompletos, niveles inconsistentes—
 * son todas defectos de configuración del sistema, no de la petición. Un
 * 4xx le diría al usuario que se equivocó él.
 *
 * Precedente idéntico: `MaturityProfileCalculationError → 500`.
 */
export class RoadmapCalculationError extends DomainError {
  override readonly code: string = 'ROADMAP_CALCULATION_FAILED';

  constructor(
    message: string,
    public readonly details?: Record<string, unknown>,
  ) {
    super(message);
  }
}

/**
 * El grafo de dependencias contiene un ciclo y por tanto no admite orden
 * topológico.
 *
 * El mensaje nombra las dimensiones implicadas. Un 500 genérico frente a
 * un grafo mal declarado sería justo el fallo silencioso que este módulo
 * tiene que evitar: quien reciba el error necesita saber qué aristas
 * revisar, no solo que algo falló.
 */
export class DependencyGraphCycleError extends RoadmapCalculationError {
  override readonly code = 'ROADMAP_GRAPH_HAS_CYCLE';

  constructor(public readonly dimensionesImplicadas: readonly string[]) {
    super(
      `El grafo de dependencias contiene un ciclo entre las dimensiones ` +
        `${[...dimensionesImplicadas].sort().join(', ')}; no admite un orden de fases. ` +
        `Revise las aristas declaradas entre ellas.`,
      { dimensionesImplicadas: [...dimensionesImplicadas].sort() },
    );
  }
}
