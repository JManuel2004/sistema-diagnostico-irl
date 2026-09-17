import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { CompiledEligibilityRule } from '../services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../services/exception-engine.service.js';

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

export interface ResolvedConfiguration {
  readonly idConfigurationVersion: string;
  readonly versionNumber: number;
  readonly idCalibrationSnapshot: string;
  readonly calibrationSnapshotNumber: number;
  readonly idParametersSnapshot: string;
  readonly parametersSnapshotNumber: number;
  readonly scale: CalibrationScale;
  readonly parameters: ScoringParameters;
  readonly profiles: readonly OrdinalProfile[];
  readonly eligibilityRules: readonly CompiledEligibilityRule[];
  readonly exceptionRules: readonly CompiledExceptionRule[];
}

export interface ActiveConfigurationRepositoryPort {
  /** La versión marcada VIGENTE, o `null` si no hay ninguna publicada. */
  loadActive(): Promise<ResolvedConfiguration | null>;
  /** Una versión concreta, con los snapshots que tenía al publicarse. */
  loadByVersion(number: number): Promise<ResolvedConfiguration | null>;
}
