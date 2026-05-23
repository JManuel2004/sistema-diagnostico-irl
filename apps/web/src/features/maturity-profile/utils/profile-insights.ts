import type { DimensionResult } from '@innlab/contracts';

/**
 * Pares fijos del marco KTH para análisis de desequilibrio (CLAUDE.md §
 * "Imbalance pairs"). Son exactamente seis, en este orden, y no son
 * configurables — son una constante del marco.
 *
 * Nota: cuando el backend (DIAGIRL-38) empiece a devolver `imbalances`
 * en `MaturityProfileResponse`, el panel debería preferir ese array a la
 * derivación local. El frontend computa esto en tanto la HU del backend
 * no exista para que el resumen sea útil end-to-end desde DIAGIRL-37.
 */
export const KTH_IMBALANCE_PAIRS: readonly [string, string][] = [
  ['TRL', 'CRL'],
  ['TRL', 'BRL'],
  ['CRL', 'BRL'],
  ['TmRL', 'FRL'],
  ['BRL', 'IPRL'],
  ['TRL', 'IPRL'],
];

/** Umbral por debajo del cual una dimensión se considera "en brecha". */
export const GAP_THRESHOLD = 3;

export type ImbalanceClassification = 'critical' | 'moderate' | 'acceptable';

export interface ImbalancePairInsight {
  readonly pair: readonly [string, string];
  readonly difference: number;
  readonly classification: ImbalanceClassification;
}

export interface ProfileInsights {
  /** Dimensión(es) con el nivel más alto (todos los empates). */
  readonly strength: { readonly level: number; readonly dimensions: readonly string[] };
  /**
   * Dimensión(es) con el nivel más bajo (todos los empates).
   * Acceptance de DIAGIRL-37: "ve identificada la dimensión o
   * dimensiones con menor nivel".
   */
  readonly bottleneck: { readonly level: number; readonly dimensions: readonly string[] };
  /** Diferencia entre el nivel máximo y el mínimo. */
  readonly asymmetry: number;
  /** Dimensiones con nivel ≤ GAP_THRESHOLD ("en brecha"). */
  readonly gapDimensions: readonly string[];
  /**
   * Análisis de los 6 pares fijos. Acceptance de DIAGIRL-37: "ve cuáles
   * pares presentan desequilibrio crítico o moderado". El consumidor
   * decide si filtra (sólo critical+moderate) o muestra los seis.
   */
  readonly imbalances: readonly ImbalancePairInsight[];
}

/**
 * Clasifica un par según la diferencia de niveles, usando la regla del
 * marco KTH (CLAUDE.md): `> 3` crítico, `2–3` moderado, `< 2` aceptable.
 */
export function classifyImbalance(difference: number): ImbalanceClassification {
  if (difference > 3) return 'critical';
  if (difference >= 2) return 'moderate';
  return 'acceptable';
}

/**
 * Función pura que produce todas las señales agregadas del perfil. NO
 * tiene side-effects ni accede a IO; se invoca directamente desde el
 * componente para que React la memoíce contra los `dimensionResults`.
 *
 * Entradas degeneradas:
 *   - Si `dimensionResults` está vacío, devuelve un esqueleto con
 *     `level: 0` y arrays vacíos. El componente debe protegerse de eso
 *     de todos modos (loading/error state).
 *   - Si falta una dimensión esperada en `KTH_IMBALANCE_PAIRS`, ese par
 *     se OMITE del análisis. (No debería pasar — el aggregate garantiza
 *     las 6 dimensiones — pero defensa en profundidad.)
 */
export function computeProfileInsights(
  dimensionResults: readonly DimensionResult[],
): ProfileInsights {
  if (dimensionResults.length === 0) {
    return {
      strength: { level: 0, dimensions: [] },
      bottleneck: { level: 0, dimensions: [] },
      asymmetry: 0,
      gapDimensions: [],
      imbalances: [],
    };
  }

  const byCode = new Map<string, number>(
    dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
  );

  const levels = dimensionResults.map((r) => r.irlLevel);
  const maxLevel = Math.max(...levels);
  const minLevel = Math.min(...levels);

  const strengthDimensions = dimensionResults
    .filter((r) => r.irlLevel === maxLevel)
    .map((r) => r.dimensionCode);
  const bottleneckDimensions = dimensionResults
    .filter((r) => r.irlLevel === minLevel)
    .map((r) => r.dimensionCode);

  const gapDimensions = dimensionResults
    .filter((r) => r.irlLevel <= GAP_THRESHOLD)
    .map((r) => r.dimensionCode);

  const imbalances: ImbalancePairInsight[] = [];
  for (const [a, b] of KTH_IMBALANCE_PAIRS) {
    const la = byCode.get(a);
    const lb = byCode.get(b);
    if (la === undefined || lb === undefined) continue;
    const difference = Math.abs(la - lb);
    imbalances.push({
      pair: [a, b],
      difference,
      classification: classifyImbalance(difference),
    });
  }

  return {
    strength: { level: maxLevel, dimensions: strengthDimensions },
    bottleneck: { level: minLevel, dimensions: bottleneckDimensions },
    asymmetry: maxLevel - minLevel,
    gapDimensions,
    imbalances,
  };
}
