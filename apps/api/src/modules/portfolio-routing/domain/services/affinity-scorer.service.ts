import type { DimensionCode, DiagnosticFacts } from '@innlab/contracts';
import type { NumericProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';

/**
 * Capa 2 — el cálculo de afinidad.
 *
 * Puro y determinista: los mismos hechos, fichas y parámetros producen
 * siempre el mismo score. Es lo que permite que la traza sea
 * reproducible meses después y que el simulador prometa algo real.
 *
 *   score = aporte_cuello_botella
 *           + aporte_brechas
 *           + aporte_desequilibrios
 *           + aporte_afinidad_etapa
 *           − penalizacion_rango
 *
 * Cada término se registra por separado **junto con la label ordinal
 * que lo originó**. Guardar la label al lado del número es lo que
 * permite explicar sin exponer la calibración: la justificación puede
 * decir "porque este servicio es *principal* en Modelo de Negocio" en vez
 * de "porque aportó 1.50".
 */
export class AffinityScorerService {
  score(
    eligible: readonly NumericProfile[],
    facts: DiagnosticFacts,
    parameters: ScoringParameters,
  ): ScoredCandidate[] {
    return eligible.map((profile) => this.puntuar(profile, facts, parameters));
  }

  private puntuar(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ): ScoredCandidate {
    const bottleneck = this.aporteCuelloBotella(profile, facts, p);
    const gaps = this.aporteBrechas(profile, facts, p);
    const imbalances = this.aporteDesequilibrios(profile, facts, p);
    const stageAffinity = this.aporteAfinidadEtapa(profile, facts, p);
    const rangePenalty = this.rangePenalty(profile, facts, p);

    const total =
      bottleneck.value +
      gaps.value +
      imbalances.value +
      stageAffinity.value -
      rangePenalty.value;

    return {
      idService: profile.idService,
      serviceName: profile.serviceName,
      contributions: {
        bottleneck,
        gaps,
        imbalances,
        stageAffinity,
        rangePenalty,
      },
      total: redondear(total),
    };
  }

  /**
   * El problema más agudo pesa más que una brecha ordinaria.
   *
   * Con empate (varias dimensiones comparten el mínimo IRL) se promedian
   * las intensities del servicio en todas ellas. Promediar trata el
   * empate simétricamente: valora igual la capacidad del servicio en cada
   * dimensión empatada. Tomar el mínimo sería más conservador y el máximo
   * más generoso; ambas rompen esa simetría.
   */
  private aporteCuelloBotella(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const cuellos = facts.bottlenecks;
    const details = cuellos.map((dim) => ({
      dimension: dim,
      sourceLabel: etiquetaDe(profile, dim),
      value: intensidadDe(profile, dim),
    }));
    const promedio =
      cuellos.length === 0
        ? 0
        : details.reduce((acc, d) => acc + d.value, 0) / cuellos.length;

    return { value: redondear(p.bottleneckWeight * promedio), details };
  }

  /**
   * Se **suman** las intensities sobre las dimensiones en brecha, no se
   * promedian: un servicio que cubre tres brechas debe puntuar más que
   * uno que cubre una, siempre que lo haga de forma significativa. Si el
   * efecto resulta excesivo, la corrección es bajar `gapWeight`, no
   * cambiar la forma del término.
   */
  private aporteBrechas(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const details = facts.gaps.map((dim) => ({
      dimension: dim,
      sourceLabel: etiquetaDe(profile, dim),
      value: intensidadDe(profile, dim),
    }));
    const suma = details.reduce((acc, d) => acc + d.value, 0);
    return { value: redondear(p.gapWeight * suma), details };
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
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const details = facts.imbalances
      .map((d) => {
        const peso =
          d.classification === 'CRITICO'
            ? p.criticalImbalanceWeight
            : d.classification === 'MODERADO'
              ? p.moderateImbalanceWeight
              : 0;
        const iIzq = intensidadDe(profile, d.left);
        const iDer = intensidadDe(profile, d.right);
        const dominante = iIzq >= iDer ? d.left : d.right;
        return {
          pair: `${d.left}-${d.right}`,
          classification: d.classification,
          sourceLabel: etiquetaDe(profile, dominante),
          value: redondear(peso * Math.max(iIzq, iDer)),
        };
      })
      .filter((d) => d.value > 0);

    const suma = details.reduce((acc, d) => acc + d.value, 0);
    return { value: redondear(suma), details };
  }

  /**
   * Afinidad de etapa. Una etapa sin registrar (`null`) no coincide con
   * ninguna: la ausencia de caracterización no debe regalar puntos.
   */
  private aporteAfinidadEtapa(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const stage = facts.characterization.stage;
    const matches = stage !== null && profile.relevantStages.includes(stage);
    return { value: matches ? redondear(p.stageAffinityWeight) : 0, matches };
  }

  /**
   * Penalización por operar fuera de la banda de madurez del servicio.
   * Comparación booleana contra el nivel promedio: dentro o fuera, sin
   * gradiente en el borde.
   */
  private rangePenalty(
    profile: NumericProfile,
    facts: DiagnosticFacts,
    p: ScoringParameters,
  ) {
    const fuera =
      facts.averageLevel < profile.minLevel ||
      facts.averageLevel > profile.maxLevel;
    return {
      value: fuera ? redondear(p.outOfRangePenalty) : 0,
      applied: fuera,
    };
  }
}

function intensidadDe(profile: NumericProfile, dim: DimensionCode): number {
  return profile.intensities.get(dim) ?? 0;
}

function etiquetaDe(profile: NumericProfile, dim: DimensionCode): string {
  return profile.labels.get(dim) ?? 'not_applicable';
}

/**
 * Los puntajes se persisten como `numeric(6,3)`. Redondear a tres
 * decimales en el dominio evita que un residuo de coma flotante haga que
 * el valor calculado y el releído de la base de datos difieran, lo que
 * rompería la comprobación de reproducibilidad.
 */
function redondear(value: number): number {
  return Math.round(value * 1000) / 1000;
}
