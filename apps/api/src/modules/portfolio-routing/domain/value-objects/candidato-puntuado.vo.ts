import type { DimensionCode } from '@innlab/contracts';

/**
 * Un servicio elegible con su puntaje y el desglose de cómo se formó.
 *
 * El desglose no es opcional ni un extra de depuración: es lo que la
 * traza persiste y lo que permite explicar una recomendación en el
 * vocabulario ordinal del negocio. Por eso cada aporte lleva la etiqueta
 * que lo originó y no solo el número resultante.
 */
export interface AporteDimensional {
  readonly dimension: DimensionCode;
  readonly etiquetaOrigen: string;
  readonly valor: number;
}

export interface AportePar {
  readonly par: string;
  readonly clasificacion: string;
  readonly etiquetaOrigen: string;
  readonly valor: number;
}

export interface DesgloseAportes {
  readonly cuelloBotella: {
    readonly valor: number;
    readonly detalle: readonly AporteDimensional[];
  };
  readonly brechas: {
    readonly valor: number;
    readonly detalle: readonly AporteDimensional[];
  };
  readonly desequilibrios: {
    readonly valor: number;
    readonly detalle: readonly AportePar[];
  };
  readonly afinidadEtapa: { readonly valor: number; readonly coincide: boolean };
  readonly penalizacionRango: {
    readonly valor: number;
    readonly aplicada: boolean;
  };
}

export interface CandidatoPuntuado {
  readonly idServicio: number;
  readonly nombreServicio: string;
  readonly aportes: DesgloseAportes;
  readonly total: number;
}
