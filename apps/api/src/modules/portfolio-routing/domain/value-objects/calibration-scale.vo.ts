import { CalibrationNotMonotonicError } from '../errors/portfolio-routing.errors.js';

/**
 * La escala ordinal: el puente entre el vocabulario que usa el equipo de
 * negocio y los números que multiplica el motor.
 *
 * Existe para que configurar una ficha nunca requiera escribir un número.
 * Quien define el portafolio dice que un servicio es `principal` en
 * Modelo de Negocio; cuánto vale `principal` es una decisión técnica
 * separada, que vive aquí y se versiona aparte.
 *
 * Invariante de monotonía: las etiquetas ordenadas por `orden` deben
 * tener valores estrictamente decrecientes. Si `secundario` valiera más
 * que `principal`, el vocabulario dejaría de significar lo que dice y
 * toda la configuración construida sobre él quedaría invertida en
 * silencio. Se comprueba al construir porque es una propiedad del
 * conjunto y no de una fila, así que ninguna restricción de base de
 * datos puede expresarla.
 */
export interface ScaleTier {
  readonly label: string;
  readonly value: number;
  readonly order: number;
}

export class CalibrationScale {
  private readonly porEtiqueta: ReadonlyMap<string, number>;

  private constructor(public readonly tiers: readonly ScaleTier[]) {
    this.porEtiqueta = new Map(tiers.map((p) => [p.label, p.value]));
  }

  static create(tiers: readonly ScaleTier[]): CalibrationScale {
    if (tiers.length === 0) {
      throw new CalibrationNotMonotonicError(
        'La scale de calibración no puede estar vacía',
      );
    }

    const ordenados = [...tiers].sort((a, b) => a.order - b.order);

    for (let i = 1; i < ordenados.length; i += 1) {
      const anterior = ordenados[i - 1];
      const actual = ordenados[i];
      if (actual.value >= anterior.value) {
        throw new CalibrationNotMonotonicError(
          `La scale no es monótona: '${actual.label}' (${actual.value}) no es ` +
            `estrictamente menor que '${anterior.label}' (${anterior.value})`,
          {
            etiquetaAnterior: anterior.label,
            valorAnterior: anterior.value,
            etiquetaActual: actual.label,
            valorActual: actual.value,
          },
        );
      }
    }

    return new CalibrationScale(ordenados);
  }

  /**
   * Valor numérico de una label.
   *
   * Una label ausente es un error de configuración, no un cero: si una
   * ficha referencia un peldaño que la escala vigente no define, el
   * cálculo silencioso daría 0 y nadie se enteraría de que la ficha quedó
   * huérfana al republicar la calibración.
   */
  valorDe(label: string): number {
    const value = this.porEtiqueta.get(label);
    if (value === undefined) {
      throw new CalibrationNotMonotonicError(
        `La label '${label}' no existe en la scale de calibración active`,
        { label, disponibles: [...this.porEtiqueta.keys()] },
      );
    }
    return value;
  }

  tiene(label: string): boolean {
    return this.porEtiqueta.has(label);
  }
}
