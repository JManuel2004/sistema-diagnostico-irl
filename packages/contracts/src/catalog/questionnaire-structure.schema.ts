import { z } from 'zod';
import { dimensionCodeSchema } from './dimension.schema.js';
import { statementSchema } from '../questionnaire/statement.schema.js';

/**
 * Una dimensión con sus 8 afirmaciones embebidas — la forma anidada
 * que el frontend consume para HU-07 ("ver el cuestionario organizado
 * por dimensiones IRL").
 *
 * Mantener el shape anidado (en vez de devolver dimensiones y
 * afirmaciones por separado) evita que el cliente tenga que hacer la
 * unión `dimension_id` ⇄ `id_dimension`. La respuesta es de tamaño
 * fijo y pequeño (6 × 8 = 48 textos), así que no hay incentivo de
 * paginación.
 */
export const dimensionWithStatementsSchema = z
  .object({
    code: dimensionCodeSchema,
    name: z.string().min(1),
    description: z.string(),
    sequence: z.number().int().min(1).max(6),
    statements: z
      .array(statementSchema)
      .length(8)
      .describe('Exactamente 8 afirmaciones por dimensión (RF-05)'),
  })
  .describe('Una dimensión con sus 8 afirmaciones embebidas');

export type DimensionWithStatements = z.infer<typeof dimensionWithStatementsSchema>;

/**
 * Estructura completa del cuestionario: 6 dimensiones × 8 afirmaciones.
 *
 * Endpoint: `GET /api/v1/catalogo/cuestionario`.
 * Cache lado-cliente: `staleTime: Infinity` (catálogo inmutable en
 * runtime — ver STATE_MANAGEMENT.md).
 */
export const questionnaireStructureSchema = z
  .object({
    versionMarco: z.string().describe('Versión del marco IRL — clave para invalidar caches'),
    dimensions: z
      .array(dimensionWithStatementsSchema)
      .length(6)
      .describe('Exactamente 6 dimensiones'),
  })
  .describe('Estructura completa del cuestionario IRL agrupada por dimensión');

export type QuestionnaireStructure = z.infer<typeof questionnaireStructureSchema>;
