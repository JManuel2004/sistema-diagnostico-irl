import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Códigos canónicos de las 6 dimensiones del marco KTH Innovation
 * Readiness Level™.
 *
 * Fuente autoritativa: tabla `irl_catalog.dimension` del modelo de
 * datos v2.0 (columna `code`). El orden coincide con
 * `dimension.sequence` ASC.
 *
 * Notar la mayúscula/minúscula de `TmRL` (KTH lo escribe así en su
 * material oficial — Team Readiness Level con la `m` minúscula).
 */
export const DIMENSION_CODES = ['TRL', 'CRL', 'BRL', 'IPRL', 'TmRL', 'FRL'] as const;

export const dimensionCodeSchema = z
  .enum(DIMENSION_CODES)
  .describe('IRL dimension code, one of TRL/CRL/BRL/IPRL/TmRL/FRL');

export type DimensionCode = z.infer<typeof dimensionCodeSchema>;

/**
 * Referencia a una dimensión con los nombres que la interfaz muestra.
 *
 * Las respuestas que nombran dimensiones por su código (el roadmap, por
 * ejemplo) las devuelven con esta forma para que el frontend no mantenga su
 * propio mapa de nombres: el catálogo de la base de datos es la única
 * fuente.
 */
export const dimensionRefSchema = z
  .object({
    code: dimensionCodeSchema,
    name: z.string().min(1).describe('Nombre completo de la dimensión en español'),
    shortName: z
      .string()
      .min(1)
      .describe('Etiqueta corta para espacios reducidos (ejes, tarjetas, líneas)'),
  })
  .describe('Referencia a una dimensión IRL con sus nombres');

export type DimensionRef = z.infer<typeof dimensionRefSchema>;

/**
 * Metadata de una dimensión IRL — código, nombre, descripción y orden
 * de presentación. Se usa para renderizar las pestañas/secciones del
 * cuestionario (HU-07) y la grilla del perfil (HU-13/HU-14).
 */
export const dimensionMetadataSchema = z
  .object({
    id: uuidSchema,
    code: dimensionCodeSchema,
    name: z.string().min(1).describe('Nombre completo de la dimensión en español'),
    description: z.string().describe('Descripción breve de lo que evalúa la dimensión'),
    sequence: z.number().int().min(1).max(6).describe('Orden de presentación: 1–6'),
  })
  .describe('Metadata de una dimensión IRL');

export type DimensionMetadata = z.infer<typeof dimensionMetadataSchema>;
