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
 * Una etapa de la iniciativa (catálogo `irl_catalog.initiative_stage`).
 *
 * Endpoint: `GET /api/v1/initiative-catalog/stages`.
 */
export const initiativeStageSchema = z
  .object({
    id: z.string().min(1),
    code: z.string().min(1),
    name: z.string().min(1).describe('Nombre de la etapa en español'),
  })
  .describe('Una etapa del catálogo de etapas de iniciativa');

export type InitiativeStage = z.infer<typeof initiativeStageSchema>;

/** Máximo de caracteres de los campos de texto libre del perfil. */
export const INITIATIVE_TEXT_MAX = 500;

const requiredText = (label: string) =>
  z
    .string()
    .trim()
    .min(1, `${label} es obligatorio`)
    .max(INITIATIVE_TEXT_MAX, `${label} no puede exceder ${String(INITIATIVE_TEXT_MAX)} caracteres`);

/**
 * Registro del perfil de una iniciativa (HU-06 / RF-04).
 *
 * `POST /api/v1/diagnostics/:id/initiative`.
 *
 * Es el paso previo al cuestionario y todos los campos son obligatorios:
 *   - `name`: 3–120 caracteres.
 *   - `sectorId` y `stageId`: ids del catálogo; el backend verifica que existan.
 *   - `declaredStage`: cómo describe el usuario su etapa, en sus palabras,
 *     junto a la etapa de catálogo (que es la que usa el enrutador).
 *   - `teamSize` es un entero ≥ 1 y `teamDescription` dice quién es el equipo.
 *
 * Volver a registrarla actualiza la iniciativa del diagnóstico.
 */
export const registerInitiativeSchema = z
  .object({
    name: z
      .string()
      .trim()
      .min(3, 'El nombre debe tener al menos 3 caracteres')
      .max(120, 'El nombre no puede exceder 120 caracteres'),
    sectorId: z.string().min(1).describe('ID del sector seleccionado'),
    productType: requiredText('El tipo de producto o servicio'),
    stageId: z.string().min(1).describe('ID de la etapa del catálogo'),
    declaredStage: requiredText('La etapa declarada'),
    teamSize: z.number().int().min(1, 'El equipo tiene al menos una persona').max(10000),
    teamDescription: requiredText('La descripción del equipo'),
    targetMarket: requiredText('El mercado objetivo'),
    currentFunding: requiredText('El financiamiento actual'),
  })
  .describe('Comando para registrar el perfil de una iniciativa');

export type RegisterInitiativeCommand = z.infer<typeof registerInitiativeSchema>;

/**
 * Iniciativa tal como la expone la API después de registrada.
 *
 * Endpoint: `GET /api/v1/diagnostics/:id/initiative`.
 *
 * Incluye el sector y la etapa embebidos para que el cliente no tenga que
 * consultar el catálogo al mostrarla.
 */
export const initiativeSchema = z
  .object({
    id: uuidSchema,
    diagnosticId: uuidSchema,
    name: z.string().min(3).max(120),
    sector: sectorSchema,
    productType: z.string().min(1),
    stage: initiativeStageSchema,
    declaredStage: z.string().min(1),
    teamSize: z.number().int().min(1),
    teamDescription: z.string().min(1),
    targetMarket: z.string().min(1),
    currentFunding: z.string().min(1),
  })
  .describe('Iniciativa registrada en un diagnóstico');

export type Initiative = z.infer<typeof initiativeSchema>;
