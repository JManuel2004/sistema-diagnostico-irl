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
export interface PeldanoEscala {
  readonly etiqueta: string;
  readonly valor: number;
  readonly orden: number;
}

export class EscalaCalibracion {
  private readonly porEtiqueta: ReadonlyMap<string, number>;

  private constructor(public readonly peldanos: readonly PeldanoEscala[]) {
    this.porEtiqueta = new Map(peldanos.map((p) => [p.etiqueta, p.valor]));
  }

  static create(peldanos: readonly PeldanoEscala[]): EscalaCalibracion {
    if (peldanos.length === 0) {
      throw new CalibrationNotMonotonicError(
        'La escala de calibración no puede estar vacía',
      );
    }

    const ordenados = [...peldanos].sort((a, b) => a.orden - b.orden);

    for (let i = 1; i < ordenados.length; i += 1) {
      const anterior = ordenados[i - 1];
      const actual = ordenados[i];
      if (actual.valor >= anterior.valor) {
        throw new CalibrationNotMonotonicError(
          `La escala no es monótona: '${actual.etiqueta}' (${actual.valor}) no es ` +
            `estrictamente menor que '${anterior.etiqueta}' (${anterior.valor})`,
          {
            etiquetaAnterior: anterior.etiqueta,
            valorAnterior: anterior.valor,
            etiquetaActual: actual.etiqueta,
            valorActual: actual.valor,
          },
        );
      }
    }

    return new EscalaCalibracion(ordenados);
  }

  /**
   * Valor numérico de una etiqueta.
   *
   * Una etiqueta ausente es un error de configuración, no un cero: si una
   * ficha referencia un peldaño que la escala vigente no define, el
   * cálculo silencioso daría 0 y nadie se enteraría de que la ficha quedó
   * huérfana al republicar la calibración.
   */
  valorDe(etiqueta: string): number {
    const valor = this.porEtiqueta.get(etiqueta);
    if (valor === undefined) {
      throw new CalibrationNotMonotonicError(
        `La etiqueta '${etiqueta}' no existe en la escala de calibración vigente`,
        { etiqueta, disponibles: [...this.porEtiqueta.keys()] },
      );
    }
    return valor;
  }

  tiene(etiqueta: string): boolean {
    return this.porEtiqueta.has(etiqueta);
  }
}
