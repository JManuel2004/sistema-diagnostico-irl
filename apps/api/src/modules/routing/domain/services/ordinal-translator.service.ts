import type { DimensionCode } from '@innlab/contracts';
import type { CalibrationScale } from '../value-objects/calibration-scale.vo.js';
import type {
  NumericProfile,
  OrdinalProfile,
} from '../value-objects/ordinal-profile.vo.js';

/**
 * Resolves the ordinal labels of each profile against a scale.
 *
 * Pure service, no IO and no decorators.
 *
 * It runs at query time rather than when the profile is seeded. Storing
 * the values inside the profile would be faster, but it would freeze each
 * profile against the calibration of that moment; re-reading an old
 * recommendation requires resolving its profiles with **its** scale, not
 * today's.
 *
 * It keeps the original label next to the value so that the explanation
 * to the user can speak the business vocabulary ("it is *primary* in
 * Business Model") instead of exposing the number.
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
        // A label missing from the scale throws: it is broken configuration,
        // not a silent zero.
        intensities.set(dimension, scale.valueFor(label));
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
