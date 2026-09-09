import { z } from 'zod';

/**
 * DSL de predicados del motor de enrutamiento.
 *
 * Un predicado es un árbol: hojas que comparan un campo de los hechos del
 * diagnóstico contra un valor, y nodos `y` / `o` / `no` que las combinan.
 *
 * Se serializa como `jsonb`, no como texto libre. La tabla
 * `regla_enrutamiento` que este modelo reemplaza tenía `condicion
 * varchar(2000)` sin formato definido en ninguna parte; con `jsonb`
 * Postgres valida la sintaxis al escribir y el predicado sigue siendo
 * consultable desde SQL, que es lo que necesita el validador inter-capas.
 *
 * El modo de compilación es lo que separa las capas 1 y 3:
 *   - `BOOLEANO` (elegibilidad) admite solo igualdad y pertenencia. Una
 *     regla de elegibilidad expresa imposibilidad, no grado.
 *   - `CON_GRADO` (excepciones) admite además comparaciones numéricas.
 *
 * Rechazar los operadores de comparación en modo `BOOLEANO` es lo que
 * impide estructuralmente que una condición de grado se cuele al filtro
 * duro, en vez de dejarlo a la disciplina de quien configura.
 */

/** Operadores admitidos en ambos modos. */
export const OPERADORES_BOOLEANOS = ['=', '!=', 'contiene', 'no_contiene'] as const;

/** Operadores que solo admite el modo `CON_GRADO`. */
export const OPERADORES_DE_GRADO = [
  '>=',
  '<=',
  '>',
  '<',
  'conteo>=',
  'conteo<=',
  'conteo=',
] as const;

export const operadorSchema = z.enum([
  ...OPERADORES_BOOLEANOS,
  ...OPERADORES_DE_GRADO,
]);
export type Operador = z.infer<typeof operadorSchema>;

/**
 * Lista blanca de campos consultables. Un campo fuera de esta lista falla
 * al compilar, no al evaluar: configurar una regla contra un campo que no
 * existe debe romperse cuando alguien la escribe, no meses después cuando
 * un diagnóstico la activa.
 */
export const CAMPOS_CONSULTABLES = [
  'cuelloBotella',
  'brechas',
  'desequilibriosCriticos',
  'desequilibriosModerados',
  'nivelPromedio',
  'nivelPorDimension.TRL',
  'nivelPorDimension.CRL',
  'nivelPorDimension.BRL',
  'nivelPorDimension.IPRL',
  'nivelPorDimension.TmRL',
  'nivelPorDimension.FRL',
  'caracterizacion.etapa',
  'caracterizacion.sector',
  'caracterizacion.tamanoEquipo',
  'caracterizacion.vinculacionAcademica',
] as const;

export const campoSchema = z.enum(CAMPOS_CONSULTABLES);
export type Campo = z.infer<typeof campoSchema>;

export const hojaPredicadoSchema = z
  .object({
    campo: campoSchema,
    op: operadorSchema,
    valor: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .describe('Comparación de un campo de los hechos contra un valor');

export type HojaPredicado = z.infer<typeof hojaPredicadoSchema>;

export type Predicado =
  | HojaPredicado
  | { op: 'y' | 'o' | 'no'; operandos: Predicado[] };

export const predicadoSchema: z.ZodType<Predicado> = z.lazy(() =>
  z.union([
    hojaPredicadoSchema,
    z.object({
      op: z.enum(['y', 'o', 'no']),
      operandos: z.array(predicadoSchema).min(1),
    }),
  ]),
);

/** Modo de compilación — determina qué operadores se aceptan. */
export const modoCompilacionSchema = z.enum(['BOOLEANO', 'CON_GRADO']);
export type ModoCompilacion = z.infer<typeof modoCompilacionSchema>;
