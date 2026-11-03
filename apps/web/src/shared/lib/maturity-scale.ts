/**
 * The maturity band of an IRL level (1..9), read as a thermometer: red for
 * the levels the system counts as a gap, then orange, yellow and green.
 * It colors the global IRL level wherever it is shown (the results header,
 * the panel), next to its number and its word: the hue is never the only
 * signal.
 *
 * The bands follow the gap rule of the profile (level 3 or less is a gap,
 * RF-13); they group levels for reading, they are not a framework rule.
 */
export interface MaturityBand {
  /** A short word for the band, shown next to the number. */
  readonly label: string;
  /** Background class of the band (bars, dots). */
  readonly bg: string;
  /** Text class of the band, AA on white. */
  readonly textInk: string;
}

const LOW: MaturityBand = {
  label: 'Madurez inicial',
  bg: 'bg-maturity-low',
  textInk: 'text-maturity-low-ink',
};
const DEVELOPING: MaturityBand = {
  label: 'Madurez en desarrollo',
  bg: 'bg-maturity-developing',
  textInk: 'text-maturity-developing-ink',
};
const ADVANCED: MaturityBand = {
  label: 'Madurez avanzada',
  bg: 'bg-maturity-advanced',
  textInk: 'text-maturity-advanced-ink',
};
const MATURE: MaturityBand = {
  label: 'Madurez alta',
  bg: 'bg-maturity-mature',
  textInk: 'text-maturity-mature-ink',
};

/** The band of a level; a decimal average is read by its rounded level. */
export function maturityBand(level: number): MaturityBand {
  const whole = Math.round(level);
  if (whole <= 3) return LOW;
  if (whole <= 5) return DEVELOPING;
  if (whole <= 7) return ADVANCED;
  return MATURE;
}

/** The background class of each segment of a 1..9 bar, segment by segment. */
export function maturitySegmentClass(segment: number): string {
  return maturityBand(segment).bg;
}
