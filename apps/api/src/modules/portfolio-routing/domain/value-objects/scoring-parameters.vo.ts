/**
 * Los pesos globales del cálculo de afinidad, congelados al publicar.
 *
 * Se pasan como un objeto de solo lectura en lugar de leerse de una
 * configuración global para que el scorer siga siendo una función pura:
 * el mismo perfil con los mismos parámetros produce siempre el mismo
 * score, que es la condición para que la traza sea reproducible.
 */
export interface ScoringParameters {
  readonly bottleneckWeight: number;
  readonly gapWeight: number;
  readonly moderateImbalanceWeight: number;
  readonly criticalImbalanceWeight: number;
  readonly stageAffinityWeight: number;
  readonly outOfRangePenalty: number;
  readonly minimumThreshold: number;
  readonly alternativesCount: number;
}
