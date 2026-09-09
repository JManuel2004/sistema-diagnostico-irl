import { z } from 'zod';
import { dimensionCodeSchema } from '../catalog/dimension.schema.js';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * Los hechos del diagnóstico: la entrada del motor de enrutamiento.
 *
 * Es un contrato deliberadamente explícito. El motor no recibe el
 * agregado `MaturityProfile` ni consulta otros módulos: recibe este
 * objeto plano, ya resuelto por el orquestador. Eso mantiene los
 * servicios de dominio puros y hace que simular un perfil sea construir
 * una estructura, no montar media base de datos.
 *
 * `cuelloBotella` es un array porque el mínimo IRL puede empatar (RF-08).
 * Ningún consumidor debe asumir cardinalidad 1.
 *
 * Los cuatro campos de `caracterizacion` son nullable porque el registro
 * de iniciativa (RF-04 / HU-06) no está implementado: hoy nada los
 * escribe. El motor trata `null` como "no coincide" en afinidad de etapa
 * y como "no excluye" en elegibilidad, y lo deja anotado en la traza —
 * una recomendación calculada sin caracterización es más débil, y eso
 * tiene que verse en lugar de pasar en silencio.
 */
export const clasificacionDesequilibrioSchema = z.enum([
  'CRITICO',
  'MODERADO',
  'ACEPTABLE',
]);

export const desequilibrioHechoSchema = z.object({
  izquierda: dimensionCodeSchema,
  derecha: dimensionCodeSchema,
  diferencia: z.number().int().min(0).max(8),
  clasificacion: clasificacionDesequilibrioSchema,
});

export const caracterizacionSchema = z.object({
  etapa: z.string().nullable(),
  sector: z.string().nullable(),
  tamanoEquipo: z.number().int().positive().nullable(),
  vinculacionAcademica: z.boolean().nullable(),
});

export type Caracterizacion = z.infer<typeof caracterizacionSchema>;

export const hechosDiagnosticoSchema = z
  .object({
    diagnosticId: uuidSchema,
    nivelPorDimension: z.record(dimensionCodeSchema, z.number().int().min(1).max(9)),
    cuellosBotella: z.array(dimensionCodeSchema).min(1),
    brechas: z.array(dimensionCodeSchema),
    desequilibrios: z.array(desequilibrioHechoSchema).length(6),
    nivelPromedio: z.number().min(1).max(9),
    caracterizacion: caracterizacionSchema,
  })
  .describe('Entrada del motor de enrutamiento de portafolio');

export type HechosDiagnostico = z.infer<typeof hechosDiagnosticoSchema>;
