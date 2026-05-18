import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Una entrada de la taxonomía de sectores (HU-06 / RF-04).
 *
 * Los sectores son catálogo: se gestionan por seed (`005-sectors.seed.ts`)
 * y son inmutables en runtime. Endpoint: `GET /api/v1/catalogo/sectores`.
 */
export const sectorSchema = z
  .object({
    id: uuidSchema,
    code: z.string().min(1).describe('Código corto del sector (e.g. "salud", "agro")'),
    name: z.string().min(1).describe('Nombre del sector en español'),
  })
  .describe('Un sector económico/temático de la taxonomía INNLAB');

export type Sector = z.infer<typeof sectorSchema>;

/**
 * Registro de la información básica de una iniciativa (HU-06 / RF-04).
 *
 * `POST /api/v1/diagnosticos/:id/iniciativa`.
 *
 * Reglas:
 *   - `nombre`: 3–120 caracteres, obligatorio.
 *   - `sectorId`: UUID del sector seleccionado; el backend verifica
 *     que exista.
 *   - `descripcion`: opcional pero recomendada, hasta 1000 caracteres.
 *     Si se envía, se valida que no sea solo whitespace.
 */
export const registerInitiativeSchema = z
  .object({
    nombre: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(120, 'El nombre no puede exceder 120 caracteres'),
    sectorId: uuidSchema.describe('ID del sector seleccionado'),
    descripcion: z
      .string()
      .trim()
      .max(1000, 'La descripción no puede exceder 1000 caracteres')
      .optional(),
  })
  .describe('Comando para registrar la información de una iniciativa');

export type RegisterInitiativeCommand = z.infer<typeof registerInitiativeSchema>;

/**
 * Iniciativa tal como la expone la API después de registrada.
 *
 * Endpoint: `GET /api/v1/diagnosticos/:id/iniciativa`.
 *
 * Incluye el sector embebido para que el cliente no tenga que hacer
 * una segunda llamada al catálogo al pintar la tarjeta.
 */
export const initiativeSchema = z
  .object({
    id: uuidSchema,
    diagnosticId: uuidSchema,
    nombre: z.string().min(3).max(120),
    sector: sectorSchema,
    descripcion: z.string().max(1000).optional(),
    createdAt: z.string().datetime(),
  })
  .describe('Iniciativa registrada en un diagnóstico');

export type Initiative = z.infer<typeof initiativeSchema>;
