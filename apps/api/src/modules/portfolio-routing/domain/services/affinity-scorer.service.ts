import type { DimensionCode, HechosDiagnostico } from '@innlab/contracts';
import type { FichaNumerica } from '../value-objects/ficha-ordinal.vo.js';
import type { ParametrosScoring } from '../value-objects/parametros-scoring.vo.js';
import type { CandidatoPuntuado } from '../value-objects/candidato-puntuado.vo.js';

/**
 * Capa 2 — el cálculo de afinidad.
 *
 * Puro y determinista: los mismos hechos, fichas y parámetros producen
 * siempre el mismo puntaje. Es lo que permite que la traza sea
 * reproducible meses después y que el simulador prometa algo real.
 *
 *   puntaje = aporte_cuello_botella
 *           + aporte_brechas
 *           + aporte_desequilibrios
 *           + aporte_afinidad_etapa
 *           − penalizacion_rango
 *
 * Cada término se registra por separado **junto con la etiqueta ordinal
 * que lo originó**. Guardar la etiqueta al lado del número es lo que
 * permite explicar sin exponer la calibración: la justificación puede
 * decir "porque este servicio es *principal* en Modelo de Negocio" en vez
 * de "porque aportó 1.50".
 */
export class AffinityScorerService {
  score(
    elegibles: readonly FichaNumerica[],
    hechos: HechosDiagnostico,
    parametros: ParametrosScoring,
  ): CandidatoPuntuado[] {
    return elegibles.map((ficha) => this.puntuar(ficha, hechos, parametros));
  }

  private puntuar(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ): CandidatoPuntuado {
    const cuelloBotella = this.aporteCuelloBotella(ficha, hechos, p);
    const brechas = this.aporteBrechas(ficha, hechos, p);
    const desequilibrios = this.aporteDesequilibrios(ficha, hechos, p);
    const afinidadEtapa = this.aporteAfinidadEtapa(ficha, hechos, p);
    const penalizacionRango = this.penalizacionRango(ficha, hechos, p);

    const total =
      cuelloBotella.valor +
      brechas.valor +
      desequilibrios.valor +
      afinidadEtapa.valor -
      penalizacionRango.valor;

    return {
      idServicio: ficha.idServicio,
      nombreServicio: ficha.nombreServicio,
      aportes: {
        cuelloBotella,
        brechas,
        desequilibrios,
        afinidadEtapa,
        penalizacionRango,
      },
      total: redondear(total),
    };
  }

  /**
   * El problema más agudo pesa más que una brecha ordinaria.
   *
   * Con empate (varias dimensiones comparten el mínimo IRL) se promedian
   * las intensidades del servicio en todas ellas. Promediar trata el
   * empate simétricamente: valora igual la capacidad del servicio en cada
   * dimensión empatada. Tomar el mínimo sería más conservador y el máximo
   * más generoso; ambas rompen esa simetría.
   */
  private aporteCuelloBotella(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ) {
    const cuellos = hechos.cuellosBotella;
    const detalle = cuellos.map((dim) => ({
      dimension: dim,
      etiquetaOrigen: etiquetaDe(ficha, dim),
      valor: intensidadDe(ficha, dim),
    }));
    const promedio =
      cuellos.length === 0
        ? 0
        : detalle.reduce((acc, d) => acc + d.valor, 0) / cuellos.length;

    return { valor: redondear(p.pesoCuelloBotella * promedio), detalle };
  }

  /**
   * Se **suman** las intensidades sobre las dimensiones en brecha, no se
   * promedian: un servicio que cubre tres brechas debe puntuar más que
   * uno que cubre una, siempre que lo haga de forma significativa. Si el
   * efecto resulta excesivo, la corrección es bajar `pesoBrecha`, no
   * cambiar la forma del término.
   */
  private aporteBrechas(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ) {
    const detalle = hechos.brechas.map((dim) => ({
      dimension: dim,
      etiquetaOrigen: etiquetaDe(ficha, dim),
      valor: intensidadDe(ficha, dim),
    }));
    const suma = detalle.reduce((acc, d) => acc + d.valor, 0);
    return { valor: redondear(p.pesoBrecha * suma), detalle };
  }

  /**
   * Aporte por desequilibrios, **ponderado por intensidad** (decisión D-3).
   *
   *   aporte = Σ  peso(clasificación) × max(intensidad[izq], intensidad[der])
   *
   * sobre los seis pares fijos del marco. Los pares `ACEPTABLE` no aportan.
   *
   * Se pondera en vez de contar por cobertura binaria porque el aporte
   * debe reflejar si el servicio *puede hacer algo* sobre ese
   * desequilibrio. Con cobertura binaria, un servicio con ficha ancha
   * pero intensidad marginal en las dimensiones afectadas puntúa igual
   * que uno que las aborda de lleno, con lo que el término premia tener
   * ficha ancha en vez de ser pertinente.
   *
   * Se toma el máximo de las dos dimensiones del par y no la suma porque
   * el desequilibrio es una propiedad del par, no de cada extremo: contar
   * ambos lo computaría dos veces.
   */
  private aporteDesequilibrios(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ) {
    const detalle = hechos.desequilibrios
      .map((d) => {
        const peso =
          d.clasificacion === 'CRITICO'
            ? p.pesoDesequilibrioCritico
            : d.clasificacion === 'MODERADO'
              ? p.pesoDesequilibrioModerado
              : 0;
        const iIzq = intensidadDe(ficha, d.izquierda);
        const iDer = intensidadDe(ficha, d.derecha);
        const dominante = iIzq >= iDer ? d.izquierda : d.derecha;
        return {
          par: `${d.izquierda}-${d.derecha}`,
          clasificacion: d.clasificacion,
          etiquetaOrigen: etiquetaDe(ficha, dominante),
          valor: redondear(peso * Math.max(iIzq, iDer)),
        };
      })
      .filter((d) => d.valor > 0);

    const suma = detalle.reduce((acc, d) => acc + d.valor, 0);
    return { valor: redondear(suma), detalle };
  }

  /**
   * Afinidad de etapa. Una etapa sin registrar (`null`) no coincide con
   * ninguna: la ausencia de caracterización no debe regalar puntos.
   */
  private aporteAfinidadEtapa(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ) {
    const etapa = hechos.caracterizacion.etapa;
    const coincide = etapa !== null && ficha.etapasPertinentes.includes(etapa);
    return { valor: coincide ? redondear(p.pesoAfinidadEtapa) : 0, coincide };
  }

  /**
   * Penalización por operar fuera de la banda de madurez del servicio.
   * Comparación booleana contra el nivel promedio: dentro o fuera, sin
   * gradiente en el borde.
   */
  private penalizacionRango(
    ficha: FichaNumerica,
    hechos: HechosDiagnostico,
    p: ParametrosScoring,
  ) {
    const fuera =
      hechos.nivelPromedio < ficha.nivelMin ||
      hechos.nivelPromedio > ficha.nivelMax;
    return {
      valor: fuera ? redondear(p.penalizacionFueraRango) : 0,
      aplicada: fuera,
    };
  }
}

function intensidadDe(ficha: FichaNumerica, dim: DimensionCode): number {
  return ficha.intensidades.get(dim) ?? 0;
}

function etiquetaDe(ficha: FichaNumerica, dim: DimensionCode): string {
  return ficha.etiquetas.get(dim) ?? 'no_aplica';
}

/**
 * Los puntajes se persisten como `numeric(6,3)`. Redondear a tres
 * decimales en el dominio evita que un residuo de coma flotante haga que
 * el valor calculado y el releído de la base de datos difieran, lo que
 * rompería la comprobación de reproducibilidad.
 */
function redondear(valor: number): number {
  return Math.round(valor * 1000) / 1000;
}
