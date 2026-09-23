import type { DimensionCode } from '@innlab/contracts';
import { DIMENSION_CODES } from '@innlab/contracts';
import { Briefcase, Cpu, CircleDollarSign, ShieldCheck, Users, UsersRound } from 'lucide-react';
import type { LucideIcon } from 'lucide-react';
import { PALETTE } from './palette';

/**
 * Visual metadata of the IRL dimensions — single source of truth.
 *
 * Why it lives here (in `shared/lib/`) and not inside the `questionnaire`
 * feature: the colors and the canonical order are consumed from several
 * surfaces — the landing, the questionnaire and the results — and the
 * feature isolation rule forbids pages from reaching into a feature's
 * folder.
 *
 * What does NOT go here:
 *  - Names (full and short) and the canonical description → they come from
 *    the backend catalog: `GET /catalog/questionnaire` and the `name` /
 *    `shortName` fields of the responses that name dimensions (profile,
 *    roadmap). Duplicating them here would create two truths.
 *  - Marketing copy (the landing's `shortDescription`) → it is editorial
 *    content of the page, not framework metadata; it lives in the page.
 *
 * What DOES go here:
 *  - The `code → Tailwind classes` mapping so no component repeats
 *    `{ TRL: 'bg-dimension-trl', ... }`, and the icon of each dimension.
 *  - The canonical display order (`DIMENSION_ORDER`).
 */
export interface DimensionVisualMeta {
  /** Tailwind class for solid backgrounds (accent bars, dots, chips). */
  readonly bg: string;
  /** Tailwind class for text darkened to AA on a white background. */
  readonly textInk: string;
  /** Border in the dimension's color (card and tab accents). */
  readonly border: string;
  /** Bottom border in the dimension's color on an active tab (literal class for Tailwind). */
  readonly tabActive: string;
  /** Background of headers and chips: neutral for all; the dimension's color goes on its icon, its text and its bars. */
  readonly tint: string;
  /** Soft background of the dimension chip: its color at 10 %. */
  readonly chip: string;
  /** Intermediate background (the stretch still to go on a level bar). */
  readonly soft: string;
  /** Icon of the dimension. */
  readonly icon: LucideIcon;
  /**
   * Fill of the dimension for SVG (the radar points): the full color, the
   * same as `bg`; `color` is the dark variant, for text.
   */
  readonly fill: string;
  /**
   * Color of the dimension for what does not accept classes: SVG attributes
   * and inline styles (e.g. the recharts radar). It is the `-ink` variant,
   * the one that reaches AA contrast on white, because in SVG it is used for
   * text; the same value as the `textInk` class, taken from `PALETTE`.
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
 * Returns the visual metadata of a dimension by code.
 *
 * `DIMENSION_ORDER` is also exported in case a consumer wants to iterate
 * without the catalog at hand (e.g. the landing before it has an API
 * response).
 */
export function getDimensionVisual(code: DimensionCode): DimensionVisualMeta {
  return DIMENSION_VISUAL[code];
}

/**
 * Canonical KTH order — mirrors `DIMENSION_CODES` of `@innlab/contracts`.
 * Importing it from here avoids accidental coupling to the declarative
 * order of the enum in `@innlab/contracts` when all that is needed is the
 * display sequence.
 */
export const DIMENSION_ORDER: readonly DimensionCode[] = DIMENSION_CODES;
