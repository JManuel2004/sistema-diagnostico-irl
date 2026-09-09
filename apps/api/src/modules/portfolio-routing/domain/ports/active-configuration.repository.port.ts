import type { EscalaCalibracion } from '../value-objects/escala-calibracion.vo.js';
import type { FichaOrdinal } from '../value-objects/ficha-ordinal.vo.js';
import type { ParametrosScoring } from '../value-objects/parametros-scoring.vo.js';
import type { ReglaElegibilidadCompilada } from '../services/eligibility-filter.service.js';
import type { ReglaExcepcionCompilada } from '../services/exception-engine.service.js';

/**
 * Puerto de lectura de la configuración de enrutamiento.
 *
 * Solo lectura, por diseño: el motor de consulta no puede escribir
 * configuración. Publicar una versión es responsabilidad del ciclo de
 * configuración, que usa un puerto distinto. La separación es
 * estructural, no una convención que alguien deba respetar.
 *
 * `loadByVersion` existe para la reproducibilidad: recalcular una
 * recomendación de enero exige cargar la versión que estaba vigente
 * entonces, con los snapshots que tenía pinchados, no los actuales.
 */
export const ACTIVE_CONFIGURATION_REPOSITORY = Symbol(
  'ACTIVE_CONFIGURATION_REPOSITORY',
);

export interface ConfiguracionResuelta {
  readonly idVersionConfiguracion: string;
  readonly numeroVersion: number;
  readonly idSnapshotCalibracion: string;
  readonly numeroSnapshotCalibracion: number;
  readonly idSnapshotParametros: string;
  readonly numeroSnapshotParametros: number;
  readonly escala: EscalaCalibracion;
  readonly parametros: ParametrosScoring;
  readonly fichas: readonly FichaOrdinal[];
  readonly reglasElegibilidad: readonly ReglaElegibilidadCompilada[];
  readonly reglasExcepcion: readonly ReglaExcepcionCompilada[];
}

export interface ActiveConfigurationRepositoryPort {
  /** La versión marcada VIGENTE, o `null` si no hay ninguna publicada. */
  loadActive(): Promise<ConfiguracionResuelta | null>;
  /** Una versión concreta, con los snapshots que tenía al publicarse. */
  loadByVersion(numero: number): Promise<ConfiguracionResuelta | null>;
}
