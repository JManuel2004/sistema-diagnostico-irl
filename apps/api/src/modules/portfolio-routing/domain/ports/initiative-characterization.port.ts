import type { Caracterizacion } from '@innlab/contracts';

/**
 * Puerto de lectura de la caracterización de la iniciativa.
 *
 * ⚠ Compromiso consciente de frontera. Lo natural sería que este dato
 * viniera de un `InitiativeModule` con su propio caso de uso, pero ese
 * módulo no existe: `src/modules/initiative/` contiene solo entidades
 * ORM, sin dominio ni casos de uso, porque el registro de iniciativa
 * (RF-04 / HU-06) no está implementado.
 *
 * Definir el puerto aquí y resolverlo con un adaptador de solo lectura
 * mantiene al motor dependiendo de una abstracción en vez de una tabla.
 * Cuando `InitiativeModule` exista, el adaptador se sustituye por una
 * llamada a su caso de uso y el motor no cambia.
 */
export const INITIATIVE_CHARACTERIZATION_READER = Symbol(
  'INITIATIVE_CHARACTERIZATION_READER',
);

export interface InitiativeCharacterizationPort {
  /**
   * Caracterización de la iniciativa del diagnóstico. Devuelve todos los
   * campos en `null` cuando no hay iniciativa registrada, que hoy es el
   * caso siempre.
   */
  findByDiagnosticId(diagnosticId: string): Promise<Caracterizacion>;
}
