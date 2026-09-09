import type { DimensionCode } from '@innlab/contracts';
import { DIMENSION_CODES } from '@innlab/contracts';

/**
 * Metadata visual de las dimensiones IRL — single source of truth.
 *
 * Por qué vive aquí (en `shared/lib/`) y no dentro del feature
 * `questionnaire`: la información cromática y el orden canónico se
 * consumen desde múltiples superficies — la landing, el cuestionario
 * y los futuros componentes del perfil (HU-13/HU-14) — y el principio
 * de "modules communicate by id only" del CLAUDE.md raíz prohíbe que
 * páginas alcancen dentro de la carpeta de un feature.
 *
 * Qué NO va aquí:
 *  - Nombre **completo** en español (`Nivel de Madurez Tecnológica`) y
 *    descripción canónica → vienen del catálogo (API
 *    `GET /catalogo/cuestionario`). Duplicarlos crearía dos verdades.
 *  - Copy de marketing (`shortDescription` del landing) → es contenido
 *    editorial de la página, no metadata del marco; vive en el page.
 *
 * Qué SÍ va aquí:
 *  - Mapeo `code → clases Tailwind` para que ningún componente repita
 *    `{ TRL: 'bg-dimension-trl', ... }`.
 *  - Orden canónico de presentación (`DIMENSION_ORDER`).
 *  - Etiqueta **corta** de display (`Tecnología`, `Negocio`). No es el
 *    nombre canónico del marco sino una abreviatura de interfaz, así que
 *    no la sirve el catálogo y no tiene sentido pedirla por red: son seis
 *    cadenas fijas. Vive aquí porque varias superficies la necesitan y el
 *    aislamiento por feature impide compartirla de otro modo.
 */
export interface DimensionVisualMeta {
  /** Clase Tailwind para fondos sólidos (barras de acento, dots, chips). */
  readonly bg: string;
  /** Clase Tailwind para texto oscurecido a AA sobre fondo blanco. */
  readonly textInk: string;
}

const DIMENSION_VISUAL: Record<DimensionCode, DimensionVisualMeta> = {
  TRL: { bg: 'bg-dimension-trl', textInk: 'text-dimension-trl-ink' },
  CRL: { bg: 'bg-dimension-crl', textInk: 'text-dimension-crl-ink' },
  BRL: { bg: 'bg-dimension-brl', textInk: 'text-dimension-brl-ink' },
  IPRL: { bg: 'bg-dimension-iprl', textInk: 'text-dimension-iprl-ink' },
  TmRL: { bg: 'bg-dimension-tmrl', textInk: 'text-dimension-tmrl-ink' },
  FRL: { bg: 'bg-dimension-frl', textInk: 'text-dimension-frl-ink' },
};

/**
 * Etiqueta corta de cada dimensión para interfaz.
 *
 * Deliberadamente breve: cabe en una tarjeta, un chip o una línea de
 * roadmap sin truncarse. Para el nombre canónico completo (`Nivel de
 * Madurez Tecnológica`) hay que ir al catálogo.
 */
const DIMENSION_SHORT_NAME: Record<DimensionCode, string> = {
  TRL: 'Tecnología',
  CRL: 'Cliente',
  BRL: 'Negocio',
  IPRL: 'Propiedad Intelectual',
  TmRL: 'Equipo',
  FRL: 'Financiación',
};

/**
 * Etiqueta corta de una dimensión. Devuelve el código tal cual si llega
 * uno desconocido: preferible a romper el render por un dato inesperado.
 */
export function getDimensionShortName(code: string): string {
  return DIMENSION_SHORT_NAME[code as DimensionCode] ?? code;
}

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
