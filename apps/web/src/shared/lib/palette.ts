/**
 * Paleta de marca — fuente única de los colores con valor propio.
 *
 * `tailwind.config.ts` importa este módulo para generar las utilidades
 * (`bg-azul-icesi`, `text-critical`, `bg-dimension-trl`…), y el código que no
 * puede usar clases (atributos SVG de recharts) lee las mismas constantes.
 * Así el color de una dimensión en el radar y en el roadmap sale del mismo
 * valor.
 *
 * Los tokens de superficie, texto y borde (`--background`, `--border`,
 * `--muted-foreground`…) viven en `globals.css` como HSL; en SVG se leen con
 * `hsl(var(--token))`.
 *
 * Los tonos de dimensión son los de `tailwind.config.ts`: el par
 * `{code}` (relleno, puntos, barras) y `{code}-ink` (texto, ≥4.5:1 sobre
 * blanco).
 */
export const PALETTE = {
  'azul-icesi': '#5454E9',
  'verde-icesi': '#4CB979',
  'amarillo-icesi': '#E4EB60',
  'morado-icesi': '#865CF0',
  'naranja-icesi': '#E9683B',
  'gris-1': '#88898C',
  'gris-2': '#CECFD4',

  // Semánticos, ligados a las clasificaciones de desequilibrio (RF-10).
  critical: { DEFAULT: '#A53221', bg: '#FBEDEA', foreground: '#FFFFFF' },
  moderate: { DEFAULT: '#8C3811', bg: '#FBEDE5', foreground: '#FFFFFF' },
  acceptable: { DEFAULT: '#1F633D', bg: '#E5F2EB', foreground: '#FFFFFF' },
  info: { DEFAULT: '#5454E9', bg: '#EFEFFB' },

  dimension: {
    trl: '#5454E9',
    crl: '#865CF0',
    brl: '#4CB979',
    iprl: '#3D3D8C',
    tmrl: '#E9683B',
    frl: '#E4EB60',

    'trl-ink': '#3737BD',
    'crl-ink': '#6037D1',
    'brl-ink': '#1F8550',
    'iprl-ink': '#3D3D8C',
    'tmrl-ink': '#B84F2A',
    'frl-ink': '#8C7818',
  },
} as const;
