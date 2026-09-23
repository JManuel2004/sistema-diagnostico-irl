import type { DimensionCode } from '@innlab/contracts';
import { DIMENSION_CODES } from '@innlab/contracts';
import { Briefcase, Cpu, CircleDollarSign, ShieldCheck, Users, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
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
 *    roadmap). Duplicarlos aquí crearía dos verdades.
 *  - Copy de marketing (`shortDescription` del landing) → es contenido
 *    editorial de la página, no metadata del marco; vive en el page.
 *
 * Qué SÍ va aquí:
 *  - Mapeo `code → clases Tailwind` para que ningún componente repita
 *    `{ TRL: 'bg-dimension-trl', ... }`, y el icono de cada dimensión.
 *  - Orden canónico de presentación (`DIMENSION_ORDER`).
 */
export interface DimensionVisualMeta {
  /** Clase Tailwind para fondos sólidos (barras de acento, dots, chips). */
  readonly bg: string;
  /** Clase Tailwind para texto oscurecido a AA sobre fondo blanco. */
  readonly textInk: string;
  /** Borde del color de la dimensión (acentos de tarjetas y pestañas). */
  readonly border: string;
  /** Borde inferior del color de la dimensión en una pestaña activa (clase literal para Tailwind). */
  readonly tabActive: string;
  /** Fondo de cabeceras y chips: neutro para todas; el color de la dimensión va en su icono, su texto y sus barras. */
  readonly tint: string;
  /** Fondo suave del chip de la dimensión: su color al 10 %. */
  readonly chip: string;
  /** Fondo intermedio (tramo por recorrer en una barra de nivel). */
  readonly soft: string;
  /** Icono de la dimensión. */
  readonly icon: LucideIcon;
  /**
   * Relleno de la dimensión para SVG (los puntos del radar): el color pleno,
   * el mismo de `bg`; `color` es la variante oscura, para texto.
   */
  readonly fill: string;
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
    border: 'border-dimension-trl',
    tabActive: 'data-[state=active]:border-dimension-trl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-trl/10',
    soft: 'bg-dimension-trl/35',
    icon: Cpu,
    fill: PALETTE.dimension.trl,
    color: PALETTE.dimension['trl-ink'],
  },
  CRL: {
    bg: 'bg-dimension-crl',
    textInk: 'text-dimension-crl-ink',
    border: 'border-dimension-crl',
    tabActive: 'data-[state=active]:border-dimension-crl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-crl/10',
    soft: 'bg-dimension-crl/35',
    icon: Users,
    fill: PALETTE.dimension.crl,
    color: PALETTE.dimension['crl-ink'],
  },
  BRL: {
    bg: 'bg-dimension-brl',
    textInk: 'text-dimension-brl-ink',
    border: 'border-dimension-brl',
    tabActive: 'data-[state=active]:border-dimension-brl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-brl/10',
    soft: 'bg-dimension-brl/35',
    icon: Briefcase,
    fill: PALETTE.dimension.brl,
    color: PALETTE.dimension['brl-ink'],
  },
  IPRL: {
    bg: 'bg-dimension-iprl',
    textInk: 'text-dimension-iprl-ink',
    border: 'border-dimension-iprl',
    tabActive: 'data-[state=active]:border-dimension-iprl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-iprl/10',
    soft: 'bg-dimension-iprl/35',
    icon: ShieldCheck,
    fill: PALETTE.dimension.iprl,
    color: PALETTE.dimension['iprl-ink'],
  },
  TmRL: {
    bg: 'bg-dimension-tmrl',
    textInk: 'text-dimension-tmrl-ink',
    border: 'border-dimension-tmrl',
    tabActive: 'data-[state=active]:border-dimension-tmrl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-tmrl/10',
    soft: 'bg-dimension-tmrl/35',
    icon: UsersRound,
    fill: PALETTE.dimension.tmrl,
    color: PALETTE.dimension['tmrl-ink'],
  },
  FRL: {
    bg: 'bg-dimension-frl',
    textInk: 'text-dimension-frl-ink',
    border: 'border-dimension-frl',
    tabActive: 'data-[state=active]:border-dimension-frl',
    tint: 'bg-surface-muted',
    chip: 'bg-dimension-frl/10',
    soft: 'bg-dimension-frl/35',
    icon: CircleDollarSign,
    fill: PALETTE.dimension.frl,
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
