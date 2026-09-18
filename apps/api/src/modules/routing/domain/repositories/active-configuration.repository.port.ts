import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ScoringParameters } from '../value-objects/scoring-parameters.vo.js';
import type { CompiledEligibilityRule } from '../services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../services/exception-engine.service.js';

/**
 * Puerto de lectura de la configuración de enrutamiento.
 *
 * Solo lectura, por diseño: el motor de consulta no puede escribir
 * configuración.
 *
 * Sin versionado: el esquema de versionado de configuración se retiró
 * (backlog 5.6) — nada en el sistema puede publicar una segunda versión,
 * así que el puerto expone una única configuración vigente, sin historial
 * que numerar ni versión concreta que cargar.
 */
export const ACTIVE_CONFIGURATION_REPOSITORY = Symbol(
  'ACTIVE_CONFIGURATION_REPOSITORY',
);

export interface ResolvedConfiguration {
  readonly scale: CalibrationScale;
  readonly parameters: ScoringParameters;
  readonly profiles: readonly OrdinalProfile[];
  readonly eligibilityRules: readonly CompiledEligibilityRule[];
  readonly exceptionRules: readonly CompiledExceptionRule[];
}

export interface ActiveConfigurationRepositoryPort {
  /** La configuración vigente, o `null` si aún no se sembró ninguna. */
  load(): Promise<ResolvedConfiguration | null>;
}
