import { CRITICAL_IRL_THRESHOLD } from '@innlab/contracts';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';
import { DIMENSION_CODES } from '../../../../shared/kernel/domain/value-objects/dimension-code.js';
import {
  DimensionResult,
  type DimensionResultPersistence,
} from '../value-objects/dimension-result.vo.js';

/**
 * `MaturityProfile` — aggregate root for the IRL maturity profile of a
 * single diagnostic (RF-07 and onward).
 *
 * Invariants enforced at construction:
 *   - Exactly **6** `DimensionResult` entries — one per IRL dimension.
 *   - Each of the six `DimensionCode` values (TRL, CRL, BRL, IPRL, TmRL,
 *     FRL) appears exactly once — no duplicates, no missing dimensions.
 *
 * Atomicity (acceptance criterion of DIAGIRL-34: "no guarda resultados
 * parciales"): the aggregate is built whole or not at all. The repository
 * persists it inside a single transaction; failure between the calculator
 * service and the repository raises a `MaturityProfileCalculationError`
 * and the database remains untouched.
 *
 * Modules communicate by id: other bounded contexts receive
 * `diagnosticId` and look up the profile via the repository, never
 * by holding a `MaturityProfile` instance directly.
 *
 * DIAGIRL-35 (bottleneck detection) and DIAGIRL-38 (imbalance evaluation)
 * compose the existing `dimensionResults` — they do **not** mutate this
 * aggregate. They will introduce their own aggregates (`Bottleneck`,
 * `ImbalanceAnalysis`) attached to the same diagnostic.
 */
export interface MaturityProfilePersistence {
  readonly diagnosticId: string;
  readonly computedAt: Date;
  readonly dimensionResults: readonly DimensionResultPersistence[];
}

export class MaturityProfile {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly computedAt: Date,
    private readonly _dimensionResults: readonly DimensionResult[],
  ) {}

  /**
   * Build a fresh profile from a calculator output. The `dimensionResults`
   * array MUST contain exactly the six IRL dimensions, each exactly once.
   *
   * @throws InvariantViolationError if the array is not exactly six unique
   *   dimensions.
   */
  static create(input: {
    diagnosticId: Uuid;
    computedAt: Date;
    dimensionResults: readonly DimensionResult[];
  }): MaturityProfile {
    MaturityProfile.assertSixUniqueDimensions(input.dimensionResults);
    return new MaturityProfile(
      input.diagnosticId,
      input.computedAt,
      MaturityProfile.sortByCanonicalOrder(input.dimensionResults),
    );
  }

  /** Hydrate from the row set returned by the repository. */
  static fromPersistence(row: MaturityProfilePersistence): MaturityProfile {
    const results = row.dimensionResults.map((r) =>
      DimensionResult.fromPersistence(r),
    );
    MaturityProfile.assertSixUniqueDimensions(results);
    return new MaturityProfile(
      Uuid.create(row.diagnosticId),
      row.computedAt,
      MaturityProfile.sortByCanonicalOrder(results),
    );
  }

  /** Read-only view of the six dimensional results, in canonical order. */
  dimensionResults(): readonly DimensionResult[] {
    return this._dimensionResults;
  }

  /** Lookup the result for one specific dimension. */
  resultFor(dimensionCode: string): DimensionResult | undefined {
    return this._dimensionResults.find(
      (r) => r.dimensionCode.value === dimensionCode,
    );
  }

  /**
   * RF-08 — Identifica el cuello de botella del perfil.
   *
   * El cuello de botella es la dimensión con el nivel IRL más bajo.
   * Si varias dimensiones comparten ese mínimo, todas se reportan
   * (empate explícito — el frontend nunca debe asumir tamaño 1).
   */
  bottleneck(): { readonly dimensions: readonly DimensionResult[]; readonly level: number } {
    const minLevel = Math.min(...this._dimensionResults.map((r) => r.irlLevel.value));
    const dimensions = this._dimensionResults.filter((r) => r.irlLevel.value === minLevel);
    return { dimensions, level: minLevel };
  }

  /**
   * RF-09 — Promedio IRL global: promedio simple de los seis niveles
   * dimensionales, redondeado a un decimal. No sustituye al cuello de botella
   * (RF-08): el progreso de la iniciativa sigue siendo el conjunto de sus seis
   * dimensiones; este es un indicador complementario.
   */
  globalAverage(): number {
    const levels = this._dimensionResults.map((r) => r.irlLevel.value);
    const mean = levels.reduce((sum, level) => sum + level, 0) / levels.length;
    return Math.round(mean * 10) / 10;
  }

  /** Dimensión(es) con el nivel IRL más alto — la fortaleza del perfil. */
  strength(): { readonly dimensions: readonly DimensionResult[]; readonly level: number } {
    const maxLevel = Math.max(...this._dimensionResults.map((r) => r.irlLevel.value));
    const dimensions = this._dimensionResults.filter((r) => r.irlLevel.value === maxLevel);
    return { dimensions, level: maxLevel };
  }

  /**
   * Amplitud del perfil: diferencia entre el IRL máximo y el mínimo,
   * clasificada con los mismos umbrales de desequilibrio KTH.
   */
  asymmetry(): {
    readonly difference: number;
    readonly classification: 'CRITICAL' | 'MODERATE' | 'ACCEPTABLE';
  } {
    const levels = this._dimensionResults.map((r) => r.irlLevel.value);
    const difference = Math.max(...levels) - Math.min(...levels);
    const classification =
      difference > 3 ? 'CRITICAL' : difference >= 2 ? 'MODERATE' : 'ACCEPTABLE';
    return { difference, classification };
  }

  /**
   * Dimensiones en brecha: nivel IRL menor o igual al umbral del marco.
   *
   * El umbral es `CRITICAL_IRL_THRESHOLD` del contrato. Puede devolver
   * cero dimensiones — no es un error, es un perfil sin brecha.
   */
  gaps(): {
    readonly dimensions: readonly DimensionResult[];
    readonly threshold: number;
  } {
    const dimensions = this._dimensionResults.filter(
      (r) => r.irlLevel.value <= CRITICAL_IRL_THRESHOLD,
    );
    return { dimensions, threshold: CRITICAL_IRL_THRESHOLD };
  }

  /**
   * RF-13 — Dimensiones en estado crítico.
   *
   * Solo las dimensiones que el marco declara susceptibles (CRL, BRL y
   * TmRL, `dimension.is_critical_dimension`) pueden estar en estado crítico,
   * y lo están cuando además su nivel IRL está en brecha (`gaps()`). TRL,
   * IPRL y FRL no reciben esta alerta cualquiera que sea su nivel, así que
   * una dimensión en brecha no es por sí sola una dimensión crítica.
   *
   * @param criticalDimensions códigos de las dimensiones susceptibles,
   *   tomados del catálogo (`is_critical_dimension`).
   */
  criticalState(criticalDimensions: ReadonlySet<string>): {
    readonly dimensions: readonly DimensionResult[];
  } {
    const dimensions = this.gaps().dimensions.filter((r) =>
      criticalDimensions.has(r.dimensionCode.value),
    );
    return { dimensions };
  }

  /** Persistence snapshot — the repository upserts the whole set atomically. */
  toPersistence(): MaturityProfilePersistence {
    return {
      diagnosticId: this.diagnosticId.value,
      computedAt: this.computedAt,
      dimensionResults: this._dimensionResults.map((r) => r.toPersistence()),
    };
  }

  // ───────────────────────────────────────────────────────────────────────
  // Internals
  // ───────────────────────────────────────────────────────────────────────

  private static assertSixUniqueDimensions(
    results: readonly DimensionResult[],
  ): void {
    if (results.length !== DIMENSION_CODES.length) {
      throw new InvariantViolationError(
        `MaturityProfile must hold exactly ${DIMENSION_CODES.length} dimension results; received ${results.length}`,
        { received: results.length, expected: DIMENSION_CODES.length },
      );
    }
    const seen = new Set<string>();
    for (const r of results) {
      const code = r.dimensionCode.value;
      if (seen.has(code)) {
        throw new InvariantViolationError(
          `MaturityProfile has duplicate result for dimension '${code}'`,
          { duplicateDimension: code },
        );
      }
      seen.add(code);
    }
    for (const expected of DIMENSION_CODES) {
      if (!seen.has(expected)) {
        throw new InvariantViolationError(
          `MaturityProfile is missing result for dimension '${expected}'`,
          { missingDimension: expected, present: [...seen] },
        );
      }
    }
  }

  private static sortByCanonicalOrder(
    results: readonly DimensionResult[],
  ): readonly DimensionResult[] {
    const indexByCode = new Map<string, number>(
      DIMENSION_CODES.map((code, idx) => [code, idx]),
    );
    return [...results].sort(
      (a, b) =>
        (indexByCode.get(a.dimensionCode.value) ?? 0) -
        (indexByCode.get(b.dimensionCode.value) ?? 0),
    );
  }
}
