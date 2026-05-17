import { z } from 'zod';

/**
 * Códigos canónicos de las 6 dimensiones del marco KTH Innovation Readiness Level™.
 *
 * Fuente autoritativa: tabla `irl_catalog.dimension` del modelo de datos v2.0
 * (columna `codigo`). El orden coincide con `dimension.orden` ASC.
 *
 * Notar la mayúscula minúscula de `TmRL` (KTH lo escribe así en su material
 * oficial — Team Readiness Level con la `m` minúscula).
 */
export const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

export const dimensionCodeSchema = z
  .enum(DIMENSION_CODES)
  .describe('IRL dimension code, one of TRL/CRL/BRL/IPRL/TmRL/FRL');

export type DimensionCode = z.infer<typeof dimensionCodeSchema>;
