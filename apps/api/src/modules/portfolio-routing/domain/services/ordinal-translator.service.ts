import type { DimensionCode } from '@innlab/contracts';
import type { EscalaCalibracion } from '../value-objects/escala-calibracion.vo.js';
import type {
  FichaNumerica,
  FichaOrdinal,
} from '../value-objects/ficha-ordinal.vo.js';

/**
 * Resuelve las etiquetas ordinales de cada ficha contra una escala.
 *
 * Servicio puro, sin IO ni decoradores.
 *
 * Se ejecuta en tiempo de consulta y no al publicar. Precalcular los
 * valores dentro de la ficha sería más rápido, pero congelaría cada ficha
 * contra la calibración vigente en el momento de publicarla; reproducir
 * una recomendación antigua exige poder releer sus fichas con **su**
 * escala, no con la de hoy.
 *
 * Conserva la etiqueta original junto al valor para que la explicación al
 * usuario pueda hablar en el vocabulario de negocio ("es *principal* en
 * Modelo de Negocio") en vez de exponer el número.
 */
export class OrdinalTranslatorService {
  translate(
    fichas: readonly FichaOrdinal[],
    escala: EscalaCalibracion,
  ): FichaNumerica[] {
    return fichas.map((ficha) => {
      const intensidades = new Map<DimensionCode, number>();
      const etiquetas = new Map<DimensionCode, string>();

      for (const [dimension, etiqueta] of ficha.intensidades.entries()) {
        // Una etiqueta ausente en la escala lanza: es configuración rota,
        // no un cero silencioso.
        intensidades.set(dimension, escala.valorDe(etiqueta));
        etiquetas.set(dimension, etiqueta);
      }

      return {
        idServicio: ficha.idServicio,
        nombreServicio: ficha.nombreServicio,
        nivelMin: ficha.nivelMin,
        nivelMax: ficha.nivelMax,
        etapasPertinentes: ficha.etapasPertinentes,
        intensidades,
        etiquetas,
      };
    });
  }
}
