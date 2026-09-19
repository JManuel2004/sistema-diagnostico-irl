import { z } from 'zod';

/**
 * DSL de predicados del motor de enrutamiento.
 *
 * Un predicado es un árbol: hojas que comparan un campo de los hechos del
 * diagnóstico contra un valor, y nodos `and` / `or` / `not` que las
 * combinan.
 *
 * Se serializa como `jsonb`, no como texto libre. La tabla
 * `regla_enrutamiento` que este modelo reemplaza tenía `condicion
 * varchar(2000)` sin formato definido en ninguna parte; con `jsonb`
 * Postgres valida la sintaxis al escribir y el predicado sigue siendo
 * consultable desde SQL, que es lo que necesita el validador inter-capas.
 *
 * El modo de compilación es lo que separa las capas 1 y 3:
 *   - `BOOLEAN` (elegibilidad) admite solo igualdad y pertenencia. Una
 *     regla de elegibilidad expresa imposibilidad, no grado.
 *   - `WITH_DEGREE` (excepciones) admite además comparaciones numéricas.
 *
 * Rechazar los operadores de comparación en modo `BOOLEAN` es lo que
 * impide estructuralmente que una condición de grado se cuele al filtro
 * duro, en vez de dejarlo a la disciplina de quien configura.
 */

/** Operadores admitidos en ambos modos. */
export const BOOLEAN_OPERATORS = ['=', '!=', 'contains', 'not_contains'] as const;

/** Operadores que solo admite el modo `WITH_DEGREE`. */
export const DEGREE_OPERATORS = [
  '>=',
  '<=',
  '>',
  '<',
  'count>=',
  'count<=',
  'count=',
] as const;

export const operatorSchema = z.enum([
  ...BOOLEAN_OPERATORS,
  ...DEGREE_OPERATORS,
]);
export type Operator = z.infer<typeof operatorSchema>;

/**
 * Lista blanca de campos consultables. Un campo fuera de esta lista falla
 * al compilar, no al evaluar: configurar una regla contra un campo que no
 * existe debe romperse cuando alguien la escribe, no meses después cuando
 * un diagnóstico la activa.
 */
export const QUERYABLE_FIELDS = [
  'bottleneck',
  'gaps',
  'criticalImbalances',
  'moderateImbalances',
  'averageLevel',
  'levelByDimension.TRL',
  'levelByDimension.CRL',
  'levelByDimension.BRL',
  'levelByDimension.IPRL',
  'levelByDimension.TmRL',
  'levelByDimension.FRL',
  'characterization.stage',
  'characterization.sector',
  'characterization.teamSize',
  'characterization.academicLinkage',
] as const;

export const fieldSchema = z.enum(QUERYABLE_FIELDS);
export type Field = z.infer<typeof fieldSchema>;

export const predicateLeafSchema = z
  .object({
    field: fieldSchema,
    op: operatorSchema,
    value: z.union([z.string(), z.number(), z.boolean(), z.null()]),
  })
  .describe('Comparación de un campo de los hechos contra un valor');

export type PredicateLeaf = z.infer<typeof predicateLeafSchema>;

export type Predicate =
  | PredicateLeaf
  | { op: 'and' | 'or' | 'not'; operands: Predicate[] };

export const predicateSchema: z.ZodType<Predicate> = z.lazy(() =>
  z.union([
    predicateLeafSchema,
    z.object({
      op: z.enum(['and', 'or', 'not']),
      operands: z.array(predicateSchema).min(1),
    }),
  ]),
);

/** Modo de compilación — determina qué operadores se aceptan. */
export const compilationModeSchema = z.enum(['BOOLEAN', 'WITH_DEGREE']);
export type CompilationMode = z.infer<typeof compilationModeSchema>;
