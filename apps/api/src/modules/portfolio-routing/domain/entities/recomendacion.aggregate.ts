import { Uuid } from '../../../../shared-kernel/domain/value-objects/uuid.vo.js';
import type { CandidatoPuntuado } from '../value-objects/candidato-puntuado.vo.js';
import type {
  ExcepcionAplicada,
  ExcepcionDescartada,
} from '../services/exception-engine.service.js';
import type { ServicioExcluido } from '../services/eligibility-filter.service.js';

/**
 * `Recomendacion` — raíz del agregado del resultado de enrutamiento.
 *
 * Una por diagnóstico, garantizado por el `UNIQUE (id_diagnostico)` de la
 * tabla: RF-15 pide exactamente una recomendación, no una lista ordenada.
 * Las alternativas son subordinadas, no recomendaciones paralelas.
 *
 * `SIN_RECOMENDACION` es un desenlace legítimo, no un fallo. RF-15 exige
 * que el sistema no devuelva una recomendación vacía ni ambigua; no exige
 * que siempre encuentre una. Si todos los candidatos quedaron excluidos o
 * ninguno superó el umbral, eso se dice explícitamente.
 */
export type ResultadoTipo = 'RECOMENDACION' | 'SIN_RECOMENDACION';

export interface TrazaEvaluacion {
  readonly excluidosCapa1: readonly ServicioExcluido[];
  readonly rankingPreExcepcion: readonly CandidatoPuntuado[];
  readonly excepcionesActivadas: readonly ExcepcionAplicada[];
  readonly excepcionesDescartadas: readonly ExcepcionDescartada[];
  readonly rankingPostExcepcion: readonly CandidatoPuntuado[];
  readonly caracterizacionIncompleta: readonly string[];
  readonly hashHechos: string;
}

export class Recomendacion {
  private constructor(
    public readonly diagnosticId: Uuid,
    public readonly idVersionConfiguracion: string,
    public readonly idSnapshotCalibracion: string,
    public readonly idSnapshotParametros: string,
    public readonly resultadoTipo: ResultadoTipo,
    public readonly principal: CandidatoPuntuado | null,
    public readonly alternativas: readonly CandidatoPuntuado[],
    public readonly justificacion: string | null,
    public readonly motivoSinRecomendacion: string | null,
    public readonly traza: TrazaEvaluacion,
    public readonly generadaEn: Date,
  ) {}

  static create(input: {
    diagnosticId: Uuid;
    idVersionConfiguracion: string;
    idSnapshotCalibracion: string;
    idSnapshotParametros: string;
    rankingFinal: readonly CandidatoPuntuado[];
    umbralMinimo: number;
    nAlternativas: number;
    justificacion: string | null;
    motivoSinRecomendacion: string | null;
    traza: TrazaEvaluacion;
    generadaEn: Date;
  }): Recomendacion {
    const sobreUmbral = input.rankingFinal.filter(
      (c) => c.total >= input.umbralMinimo,
    );

    if (sobreUmbral.length === 0) {
      return new Recomendacion(
        input.diagnosticId,
        input.idVersionConfiguracion,
        input.idSnapshotCalibracion,
        input.idSnapshotParametros,
        'SIN_RECOMENDACION',
        null,
        [],
        null,
        input.motivoSinRecomendacion ??
          'Ningún servicio del portafolio alcanzó la pertinencia mínima para este perfil.',
        input.traza,
        input.generadaEn,
      );
    }

    return new Recomendacion(
      input.diagnosticId,
      input.idVersionConfiguracion,
      input.idSnapshotCalibracion,
      input.idSnapshotParametros,
      'RECOMENDACION',
      sobreUmbral[0],
      sobreUmbral.slice(1, 1 + input.nAlternativas),
      input.justificacion,
      null,
      input.traza,
      input.generadaEn,
    );
  }

  /**
   * Rehidrata desde persistencia. La traza se conserva completa porque es
   * lo que hace explicable una recomendación antigua.
   */
  static fromPersistence(row: {
    diagnosticId: string;
    idVersionConfiguracion: string;
    idSnapshotCalibracion: string;
    idSnapshotParametros: string;
    resultadoTipo: ResultadoTipo;
    principal: CandidatoPuntuado | null;
    alternativas: readonly CandidatoPuntuado[];
    justificacion: string | null;
    motivoSinRecomendacion: string | null;
    traza: TrazaEvaluacion;
    generadaEn: Date;
  }): Recomendacion {
    return new Recomendacion(
      Uuid.create(row.diagnosticId),
      row.idVersionConfiguracion,
      row.idSnapshotCalibracion,
      row.idSnapshotParametros,
      row.resultadoTipo,
      row.principal,
      row.alternativas,
      row.justificacion,
      row.motivoSinRecomendacion,
      row.traza,
      row.generadaEn,
    );
  }

  /**
   * Verdadero cuando el servicio recomendado NO es el que ganó el
   * cálculo, sino uno que un ajuste puntual colocó ahí.
   *
   * Es la distinción que separa un sistema auditable de uno que parece
   * objetivo sin serlo, y por eso se deriva del agregado en vez de
   * dejarla a criterio de quien pinte la pantalla.
   */
  ajustadoPorExcepcion(): boolean {
    const ganadorCalculo = this.traza.rankingPreExcepcion[0];
    const ganadorFinal = this.traza.rankingPostExcepcion[0];
    if (!ganadorCalculo || !ganadorFinal) return false;
    return ganadorCalculo.idServicio !== ganadorFinal.idServicio;
  }
}
