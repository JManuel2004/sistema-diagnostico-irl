/**
 * Brand palette — single source of the colors with a value of their own.
 *
 * `tailwind.config.ts` imports this module to generate the utilities
 * (`bg-azul-icesi`, `text-critical`, `bg-dimension-trl`…), and code that
 * cannot use classes (recharts SVG attributes) reads the same constants.
 * That way the color of a dimension in the radar and in the roadmap comes
 * from the same value.
 *
 * The surface, text and border tokens (`--background`, `--border`,
 * `--muted-foreground`…) live in `globals.css` as HSL; in SVG they are read
 * with `hsl(var(--token))`.
 *
 * The dimension tones are the ones of `tailwind.config.ts`: the pair
 * `{code}` (fill, dots, bars) and `{code}-ink` (text, ≥4.5:1 on white).
 */
export const PALETTE = {
  'azul-icesi': '#5454E9',
  'verde-icesi': '#4CB979',
  'amarillo-icesi': '#E4EB60',
  'morado-icesi': '#865CF0',
  'naranja-icesi': '#E9683B',
  'gris-1': '#88898C',
  'gris-2': '#CECFD4',

  // Semantic tones, tied to the imbalance classifications (RF-10). Their
  // background is white: the state reads in the text, the icon and the
  // border, not in a colored fill (innlab.org's color rule).
  critical: { DEFAULT: '#C0392B', bg: '#FFFFFF', foreground: '#FFFFFF' },
  moderate: { DEFAULT: '#B45309', bg: '#FFFFFF', foreground: '#FFFFFF' },
  acceptable: { DEFAULT: '#1B7A48', bg: '#FFFFFF', foreground: '#FFFFFF' },
  info: { DEFAULT: '#5454E9', bg: '#FFFFFF' },

  dimension: {
    trl: '#5454E9',
    crl: '#865CF0',
    brl: '#4CB979',
    iprl: '#3D3D8C',
    // Amber, not Naranja Icesi: a red-orange read as a warning on data that
    // is not negative, and collided with the `moderate` hue.
    tmrl: '#D98E04',
    frl: '#E4EB60',

    'trl-ink': '#3737BD',
    'crl-ink': '#7C4FEA',
    'brl-ink': '#1F8550',
    'iprl-ink': '#3D3D8C',
    'tmrl-ink': '#8A5A00',
    'frl-ink': '#8C7818',
  },

  // How mature an IRL level is, 1 to 9, as the thermometer of the KTH
  // framework's material: red, orange, yellow, green. Red covers the
  // levels the system counts as a gap (3 or less). `{band}` paints bars;
  // `{band}-ink` is the text, ≥4.5:1 on white. The level always goes along
  // as a number and a word, so the hue is never the only signal.
  maturity: {
    low: '#C0392B',
    'low-ink': '#B03224',
    developing: '#E07B24',
    'developing-ink': '#A8500B',
    advanced: '#E3B505',
    'advanced-ink': '#7A5C00',
    mature: '#2E9E5B',
    'mature-ink': '#1B7A48',
  },

  // How much the user agreed with a statement, 1 to 5: a sequential ramp of
  // one cool hue (blue, OKLCH h 250), from a pale blue to a very dark one,
  // as the usability tests recommended (P05: a warm-to-cold heat map was
  // asked for; the advice was a sequential blue ramp, which does not saturate).
  // Checked as an ordinal ramp: monotone lightness, ΔL ≥ 0.06 between steps,
  // the lightest at 2.06:1 on white so it still reads as a cell. Its number
  // goes in dark text on 1–2 (≥4.6:1) and in white on 3–5 (≥4.7:1), and it
  // is always written, so the shade is never the only signal.
  likert: {
    1: '#98B8DA',
    2: '#71A1D3',
    3: '#2B76BB',
    4: '#015595',
    5: '#01355F',
  },
} as const;
