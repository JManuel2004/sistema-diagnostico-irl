import { z } from 'zod';
import { uuidSchema } from '../common/uuid.schema.js';

/**
 * La traza por capas — el artefacto que hace auditable una recomendación.
 *
 * Audiencia: el equipo de INNLAB, no el líder de iniciativa. Muestra qué
 * hizo cada capa y, sobre todo, si el servicio recomendado es el que ganó
 * el cálculo o el que un ajuste puntual colocó ahí.
 *
 * `excepcionesActivadas` guarda el ranking anterior y posterior de **cada**
 * excepción por separado, no solo el resultado agregado. Sin ese detalle,
 * una recomendación cuestionada seis meses después no se puede atribuir al
 * ajuste concreto que la produjo, que es justo para lo que existe la traza.
 *
 * Los aportes se reportan junto con la etiqueta ordinal que los originó,
 * para que la explicación pueda decir "porque este servicio es *principal*
 * en Modelo de Negocio" y no "porque aportó 1.50". El vocabulario ordinal
 * es el que entiende el equipo de negocio; el número es un detalle de
 * implementación de la calibración.
 */
export const aporteDimensionalSchema = z.object({
  dimension: z.string(),
  etiquetaOrigen: z.string(),
  valor: z.number(),
});

export const desgloseAportesSchema = z.object({
  cuelloBotella: z.object({
    valor: z.number(),
    detalle: z.array(aporteDimensionalSchema),
  }),
  brechas: z.object({
    valor: z.number(),
    detalle: z.array(aporteDimensionalSchema),
  }),
  desequilibrios: z.object({
    valor: z.number(),
    detalle: z.array(
      z.object({
        par: z.string(),
        clasificacion: z.string(),
        etiquetaOrigen: z.string(),
        valor: z.number(),
      }),
    ),
  }),
  afinidadEtapa: z.object({ valor: z.number(), coincide: z.boolean() }),
  penalizacionRango: z.object({ valor: z.number(), aplicada: z.boolean() }),
});

export type DesgloseAportes = z.infer<typeof desgloseAportesSchema>;

export const entradaRankingSchema = z.object({
  posicion: z.number().int().positive(),
  idServicio: z.number().int().positive(),
  nombre: z.string(),
  puntaje: z.number(),
  aportes: desgloseAportesSchema.optional(),
});

export const exclusionCapa1Schema = z.object({
  idServicio: z.number().int().positive(),
  nombre: z.string(),
  mensajeExclusion: z.string(),
});

export const excepcionActivadaSchema = z.object({
  codigo: z.string(),
  orden: z.number().int().positive(),
  accion: z.enum(['FORZAR', 'VETAR', 'PROMOVER', 'DEGRADAR']),
  servicioObjetivo: z.string(),
  motivoDeclarado: z.string(),
  rankingAntes: z.array(entradaRankingSchema),
  rankingDespues: z.array(entradaRankingSchema),
  efecto: z.string(),
});

export const excepcionDescartadaSchema = z.object({
  codigo: z.string(),
  orden: z.number().int().positive(),
  razon: z.string(),
});

export const trazaCapasResponseSchema = z
  .object({
    diagnosticId: uuidSchema,
    excluidosCapa1: z.array(exclusionCapa1Schema),
    rankingPreExcepcion: z.array(entradaRankingSchema),
    excepcionesActivadas: z.array(excepcionActivadaSchema),
    excepcionesDescartadas: z.array(excepcionDescartadaSchema),
    rankingPostExcepcion: z.array(entradaRankingSchema),
    /**
     * Verdadero cuando el servicio recomendado NO es el que ganó el
     * cálculo. Es la línea que separa un sistema auditable de uno que
     * parece objetivo sin serlo.
     */
    ajustadoPorExcepcion: z.boolean(),
    caracterizacionIncompleta: z.array(z.string()),
    versionConfiguracion: z.number().int().positive(),
    snapshotCalibracion: z.number().int().positive(),
    snapshotParametros: z.number().int().positive(),
    hashHechos: z.string(),
    evaluadoEn: z.string().datetime(),
  })
  .describe('Traza por capas de una evaluación de enrutamiento');

export type TrazaCapasResponse = z.infer<typeof trazaCapasResponseSchema>;
export type EntradaRanking = z.infer<typeof entradaRankingSchema>;
export type ExcepcionActivada = z.infer<typeof excepcionActivadaSchema>;
export type ExcepcionDescartada = z.infer<typeof excepcionDescartadaSchema>;
export type ExclusionCapa1 = z.infer<typeof exclusionCapa1Schema>;
