import { DIMENSION_CODES, type DimensionCode } from '@innlab/contracts';
import type { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { RoadmapCalculationError } from '../errors/roadmap.errors.js';

/**
 * Una dimensión dentro de una fase: dónde está, a dónde tiene que
 * llegar, y a quién desbloquea al hacerlo.
 *
 * `enables` es la justificación legible de por qué esta dimensión va en
 * esta fase y no después. Que sea legible es deliberado: es lo único que
 * permite a un consultor **refutar** el orden propuesto. El sistema
 * puede validar que el grafo sea acíclico, pero no que sus aristas sean
 * ciertas; exponer el porqué es lo que convierte una afirmación
 * metodológica en algo discutible en vez de en una caja negra.
 */
export interface RoadmapDimensionTarget {
  readonly dimensionCode: DimensionCode;
  readonly currentLevel: number;
  readonly targetLevel: number;
  readonly enables: readonly DimensionCode[];
}

/**
 * Una fase del roadmap. Las dimensiones de una misma fase no dependen
 * entre sí y se trabajan **en paralelo**.
 */
export interface RoadmapPhase {
  readonly order: number;
  readonly dimensions: readonly RoadmapDimensionTarget[];
}

/**
 * `ScalingRoadmap` — raíz del agregado del roadmap de escalamiento (RF-14).
 *
 * Cubre **solo las dimensiones que hay que intervenir**, no las seis.
 * Esto contradice la letra de RF-14, que pide "exactamente seis bloques,
 * uno por dimensión": el enfoque de dependencias es incompatible con esa
 * redacción y el SRS tendrá que actualizarse. `dimensionsWithoutIntervention`
 * mitiga en parte el desajuste dejando explícito que las seis se
 * consideraron y por qué tres quedaron fuera — sin él, la ausencia de una
 * dimensión se leería como un olvido.
 *
 * Un roadmap vacío es un resultado válido: significa que la iniciativa
 * cumple el mínimo en todas partes. No es un error.
 */
export class ScalingRoadmap {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly phases: readonly RoadmapPhase[],
    public readonly dimensionsWithoutIntervention: readonly DimensionCode[],
    public readonly generatedAt: Date,
  ) {}

  static create(input: {
    diagnosticId: Uuid;
    phases: readonly RoadmapPhase[];
    generatedAt: Date;
  }): ScalingRoadmap {
    const intervenidas = new Set<DimensionCode>();
    for (const fase of input.phases) {
      for (const d of fase.dimensions) {
        if (intervenidas.has(d.dimensionCode)) {
          throw new RoadmapCalculationError(
            `La dimensión '${d.dimensionCode}' aparece en más de una fase del roadmap`,
            { dimension: d.dimensionCode },
          );
        }
        intervenidas.add(d.dimensionCode);

        if (d.targetLevel <= d.currentLevel) {
          // Si una dimensión entró al roadmap, es porque algo la exige
          // por encima de donde está. Una meta que no supera el nivel
          // actual significa que el cierre incorporó una dimensión que
          // no lo necesitaba.
          throw new RoadmapCalculationError(
            `La meta de '${d.dimensionCode}' (${d.targetLevel}) no supera su nivel actual ` +
              `(${d.currentLevel}); no habría nada que hacer en esa fase`,
            {
              dimension: d.dimensionCode,
              nivelActual: d.currentLevel,
              nivelMeta: d.targetLevel,
            },
          );
        }
      }
    }

    const ordenes = input.phases.map((f) => f.order);
    const esperado = ordenes.map((_, i) => i + 1);
    if (ordenes.join(',') !== esperado.join(',')) {
      throw new RoadmapCalculationError(
        `Las fases deben numerarse consecutivamente desde 1; se recibió [${ordenes.join(', ')}]`,
        { ordenes },
      );
    }

    return new ScalingRoadmap(
      input.diagnosticId,
      input.phases,
      DIMENSION_CODES.filter((c) => !intervenidas.has(c)),
      input.generatedAt,
    );
  }

  /** Un perfil que cumple el mínimo en las seis dimensiones. */
  isEmpty(): boolean {
    return this.phases.length === 0;
  }
}
