import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Una entrada de la taxonomía de sectores (HU-06 / RF-04).
 *
 * Los sectores son catálogo: se gestionan por seed y son inmutables en
 * runtime. Endpoint: `GET /api/v1/initiative-catalog/sectors`.
 *
 * `id` es el identificador bigint de `irl_catalog.sector` expuesto como
 * string — no hay columna `code` en esa tabla (a diferencia de
 * `initiative_stage`, que sí la tiene); un `code` corto quedó fuera de
 * este schema porque nunca existió en el esquema real.
 */
export const sectorSchema = z
  .object({
    id: z.string().min(1),
    name: z.string().min(1).describe('Nombre del sector en español'),
  })
  .describe('Un sector económico/temático de la taxonomía INNLAB');

export type Sector = z.infer<typeof sectorSchema>;

/**
 * Registro de la información básica de una iniciativa (HU-06 / RF-04).
 *
 * `POST /api/v1/diagnostics/:id/initiative`.
 *
 * Reglas:
 *   - `name`: 3–120 caracteres, obligatorio.
 *   - `sectorId`: id del sector seleccionado; el backend verifica que
 *     exista.
 *   - `shortDescription`: obligatoria, hasta 1000 caracteres — la
 *     columna es `NOT NULL` en `irl_diagnostic.initiative`, así que a
 *     diferencia de una versión anterior de este schema no es opcional.
 */
export const registerInitiativeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(120, 'El nombre no puede exceder 120 caracteres'),
    sectorId: z.string().min(1).describe('ID del sector seleccionado'),
    shortDescription: z
      .string()
      .trim()
      .min(1, 'La descripción es obligatoria')
      .max(1000, 'La descripción no puede exceder 1000 caracteres'),
  })
  .describe('Comando para registrar la información de una iniciativa');

export type RegisterInitiativeCommand = z.infer<typeof registerInitiativeSchema>;

/**
 * Iniciativa tal como la expone la API después de registrada.
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/initiative`.
 *
 * Incluye el sector embebido para que el cliente no tenga que hacer
 * una segunda llamada al catálogo al pintar la tarjeta. No incluye
 * `createdAt`: `irl_diagnostic.initiative` no tiene esa columna.
 */
export const initiativeSchema = z
  .object({
    id: uuidSchema,
    diagnosticId: uuidSchema,
    name: z.string().min(3).max(120),
    sector: sectorSchema,
    description: z.string().max(1000),
  })
  .describe('Iniciativa registrada en un diagnóstico');

export type Initiative = z.infer<typeof initiativeSchema>;
