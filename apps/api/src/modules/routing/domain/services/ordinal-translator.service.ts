import type { DimensionCode } from '@innlab/contracts';
import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type {
  NumericProfile,
  OrdinalProfile,
} from '../value-objects/ordinal-profile.vo.js';

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
 * Conserva la label original junto al valor para que la explicación al
 * usuario pueda hablar en el vocabulario de negocio ("es *principal* en
 * Modelo de Negocio") en vez de exponer el número.
 */
export class OrdinalTranslatorService {
  translate(
    profiles: readonly OrdinalProfile[],
    scale: CalibrationScale,
  ): NumericProfile[] {
    return profiles.map((profile) => {
      const intensities = new Map<DimensionCode, number>();
      const labels = new Map<DimensionCode, string>();

      for (const [dimension, label] of profile.intensities.entries()) {
        // Una label ausente en la escala lanza: es configuración rota,
        // no un cero silencioso.
        intensities.set(dimension, scale.valorDe(label));
        labels.set(dimension, label);
      }

      return {
        idService: profile.idService,
        serviceName: profile.serviceName,
        minLevel: profile.minLevel,
        maxLevel: profile.maxLevel,
        relevantStages: profile.relevantStages,
        intensities,
        labels,
      };
    });
  }
}
