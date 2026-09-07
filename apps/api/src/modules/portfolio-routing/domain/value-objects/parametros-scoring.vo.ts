/**
 * Los pesos globales del cálculo de afinidad, congelados al publicar.
 *
 * Se pasan como un objeto de solo lectura en lugar de leerse de una
 * configuración global para que el scorer siga siendo una función pura:
 * el mismo perfil con los mismos parámetros produce siempre el mismo
 * puntaje, que es la condición para que la traza sea reproducible.
 */
export interface ParametrosScoring {
  readonly pesoCuelloBotella: number;
  readonly pesoBrecha: number;
  readonly pesoDesequilibrioModerado: number;
  readonly pesoDesequilibrioCritico: number;
  readonly pesoAfinidadEtapa: number;
  readonly penalizacionFueraRango: number;
  readonly umbralMinimo: number;
  readonly nAlternativas: number;
}
