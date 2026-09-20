import type { DimensionCode } from '@innlab/contracts';
import { DIMENSION_CODES } from '@innlab/contracts';
import { PALETTE } from './palette';

/**
 * Metadata visual de las dimensiones IRL — single source of truth.
 *
 * Por qué vive aquí (en `shared/lib/`) y no dentro del feature
 * `questionnaire`: la información cromática y el orden canónico se
 * consumen desde múltiples superficies — la landing, el cuestionario
 * y los futuros componentes del perfil (HU-13/HU-14) — y el principio
 * de "modules communicate by id only" prohíbe que páginas alcancen
 * dentro de la carpeta de un feature.
 *
 * Qué NO va aquí:
 *  - Nombres (completo y corto) y descripción canónica → vienen del backend,
 *    del catálogo: `GET /catalog/questionnaire` y los campos `name` /
 *    `shortName` de las respuestas que nombran dimensiones (perfil,
 *    roadmap). Duplicarlos aquí crearía dos verdades (backlog 4.5).
 *  - Copy de marketing (`shortDescription` del landing) → es contenido
 *    editorial de la página, no metadata del marco; vive en el page.
 *
 * Qué SÍ va aquí:
 *  - Mapeo `code → clases Tailwind` para que ningún componente repita
 *    `{ TRL: 'bg-dimension-trl', ... }`.
 *  - Orden canónico de presentación (`DIMENSION_ORDER`).
 */
export interface DimensionVisualMeta {
  /** Clase Tailwind para fondos sólidos (barras de acento, dots, chips). */
  readonly bg: string;
  /** Clase Tailwind para texto oscurecido a AA sobre fondo blanco. */
  readonly textInk: string;
  /**
   * Color de la dimensión para lo que no admite clases: atributos SVG y
   * estilos en línea (p. ej. el radar de recharts). Es la variante `-ink`,
   * la que alcanza contraste AA sobre blanco, porque en SVG se usa para
   * texto; el mismo valor que la clase `textInk`, salido de `PALETTE`.
   */
  readonly color: string;
}

const DIMENSION_VISUAL: Record<DimensionCode, DimensionVisualMeta> = {
  TRL: {
    bg: 'bg-dimension-trl',
    textInk: 'text-dimension-trl-ink',
    color: PALETTE.dimension['trl-ink'],
  },
  CRL: {
    bg: 'bg-dimension-crl',
    textInk: 'text-dimension-crl-ink',
    color: PALETTE.dimension['crl-ink'],
  },
  BRL: {
    bg: 'bg-dimension-brl',
    textInk: 'text-dimension-brl-ink',
    color: PALETTE.dimension['brl-ink'],
  },
  IPRL: {
    bg: 'bg-dimension-iprl',
    textInk: 'text-dimension-iprl-ink',
    color: PALETTE.dimension['iprl-ink'],
  },
  TmRL: {
    bg: 'bg-dimension-tmrl',
    textInk: 'text-dimension-tmrl-ink',
    color: PALETTE.dimension['tmrl-ink'],
  },
  FRL: {
    bg: 'bg-dimension-frl',
    textInk: 'text-dimension-frl-ink',
    color: PALETTE.dimension['frl-ink'],
  },
};

/**
 * Devuelve la metadata visual de una dimensión por código.
 *
 * Se reexporta también `DIMENSION_ORDER` por si algún consumidor quiere
 * iterar sin disponer del catálogo (p. ej. la landing antes de
 * tener una respuesta del API).
 */
export function getDimensionVisual(code: DimensionCode): DimensionVisualMeta {
  return DIMENSION_VISUAL[code];
}

/**
 * Orden canónico KTH — espeja `DIMENSION_CODES` de `@innlab/contracts`.
 * Importarlo desde aquí evita acoplamiento accidental al orden
 * declarativo del enum en `@innlab/contracts` cuando lo único que se
 * necesita es la secuencia de presentación.
 */
export const DIMENSION_ORDER: readonly DimensionCode[] = DIMENSION_CODES;
