import {
  QUERYABLE_FIELDS,
  BOOLEAN_OPERATORS,
  type Field,
  type DiagnosticFacts,
  type CompilationMode,
  type Operator,
} from '@innlab/contracts';
import { PredicateCompilationError } from '../exceptions/routing.errors.js';

/**
 * Compilador y evaluador del DSL de predicados.
 *
 * Dos responsabilidades separadas a propósito:
 *
 *   - `compile()` valida la forma del predicate y lo convierte en un
 *     árbol tipado. Se ejecuta al **configurar**: un campo desconocido o
 *     un operador no admitido en el modo revientan aquí, cuando alguien
 *     escribe la regla, no meses después cuando un diagnóstico real la
 *     activa. Esa diferencia de momento es todo el valor de compilar.
 *
 *   - `evaluarExpresion()` recorre el árbol ya compilado contra unos
 *     hechos. No valida nada: confía en que el árbol pasó por el
 *     compilador, que es lo que garantiza el repositorio al leer.
 *
 * El modo es lo que impide estructuralmente que una condición de grado se
 * cuele al filtro duro. En `BOOLEANO` solo se admite igualdad y
 * pertenencia; `>=`, `<`, `conteo>=` y compañía se rechazan. No es una
 * convención que alguien deba recordar: la regla no compila.
 *
 * Servicio puro, sin IO ni decoradores.
 */

export type ExpressionTree =
  | { readonly type: 'leaf'; readonly field: Field; readonly op: Operator; readonly value: unknown }
  | { readonly type: 'and' | 'or' | 'not'; readonly operands: readonly ExpressionTree[] };

const CAMPOS = new Set<string>(QUERYABLE_FIELDS);
const BOOLEANOS = new Set<string>(BOOLEAN_OPERATORS);

/**
 * Cómo se comporta cada campo consultable, lo que decide qué operadores
 * admite:
 *   - `collection`: su valor es una colección; admite `contains` y `count*`.
 *   - `numeric`: admite comparaciones de orden.
 *   - `scalar`: texto o booleano; solo igualdad.
 *
 * Tipado como `Record<Field, …>` a propósito: añadir un campo a
 * `QUERYABLE_FIELDS` en `@innlab/contracts` no compila hasta que se declare
 * aquí su tipo. Antes eran dos `Set` paralelos y un campo nuevo que no caía
 * en ninguno se aceptaba en silencio, sin la validación de tipo esperada
 * (backlog 5.2).
 */
export type FieldKind = 'collection' | 'numeric' | 'scalar';

export const FIELD_KIND: Record<Field, FieldKind> = {
  bottleneck: 'collection',
  gaps: 'collection',
  criticalImbalances: 'collection',
  moderateImbalances: 'collection',
  averageLevel: 'numeric',
  'levelByDimension.TRL': 'numeric',
  'levelByDimension.CRL': 'numeric',
  'levelByDimension.BRL': 'numeric',
  'levelByDimension.IPRL': 'numeric',
  'levelByDimension.TmRL': 'numeric',
  'levelByDimension.FRL': 'numeric',
  'characterization.stage': 'scalar',
  'characterization.sector': 'scalar',
  'characterization.teamSize': 'numeric',
  'characterization.academicLinkage': 'scalar',
};

export class PredicateCompilerService {
  compile(predicate: unknown, modo: CompilationMode): ExpressionTree {
    return this.compilarNodo(predicate, modo, 'root');
  }

  private compilarNodo(
    nodo: unknown,
    modo: CompilationMode,
    ruta: string,
  ): ExpressionTree {
    if (typeof nodo !== 'object' || nodo === null) {
      throw new PredicateCompilationError(
        `Predicate malformado en ${ruta}: se esperaba un objeto`,
        { ruta, recibido: typeof nodo },
      );
    }

    const obj = nodo as Record<string, unknown>;
    const op = obj.op;

    if (typeof op !== 'string') {
      throw new PredicateCompilationError(
        `Predicate malformado en ${ruta}: falta el operador 'op'`,
        { ruta },
      );
    }

    if (op === 'and' || op === 'or' || op === 'not') {
      const operands = obj.operands;
      if (!Array.isArray(operands) || operands.length === 0) {
        throw new PredicateCompilationError(
          `El operador '${op}' en ${ruta} requiere al menos un operando`,
          { ruta, op },
        );
      }
      if (op === 'not' && operands.length !== 1) {
        throw new PredicateCompilationError(
          `El operador 'not' en ${ruta} admite exactamente un operando, recibió ${operands.length}`,
          { ruta, recibidos: operands.length },
        );
      }
      return {
        type: op,
        operands: operands.map((hijo, i) =>
          this.compilarNodo(hijo, modo, `${ruta}.${op}[${i}]`),
        ),
      };
    }

    return this.compilarHoja(obj, op, modo, ruta);
  }

  private compilarHoja(
    obj: Record<string, unknown>,
    op: string,
    modo: CompilationMode,
    ruta: string,
  ): ExpressionTree {
    const field = obj.field;

    if (typeof field !== 'string' || !CAMPOS.has(field)) {
      throw new PredicateCompilationError(
        `Campo desconocido '${String(field)}' en ${ruta}. ` +
          `Los campos consultables son: ${QUERYABLE_FIELDS.join(', ')}`,
        { ruta, field, disponibles: [...CAMPOS] },
      );
    }

    const esDeGrado = !BOOLEANOS.has(op);

    if (esDeGrado && modo === 'BOOLEAN') {
      throw new PredicateCompilationError(
        `El operador '${op}' expresa grado y no se admite en modo BOOLEAN (${ruta}). ` +
          'Las reglas de elegibilidad expresan imposibilidad, no grado: ' +
          'si la condición necesita comparar magnitudes, pertenece a la capa de exceptions.',
        { ruta, op, modo },
      );
    }

    if (!BOOLEANOS.has(op) && !this.esOperadorDeGradoConocido(op)) {
      throw new PredicateCompilationError(
        `Operador desconocido '${op}' en ${ruta}`,
        { ruta, op },
      );
    }

    this.verificarCompatibilidad(field, op, obj.value, ruta);

    return { type: 'leaf', field: field as Field, op: op as Operator, value: obj.value };
  }

  private esOperadorDeGradoConocido(op: string): boolean {
    return ['>=', '<=', '>', '<', 'count>=', 'count<=', 'count='].includes(op);
  }

  /**
   * Comprueba que el operador tenga sentido para el campo y que el tipo
   * del valor case. Sin esto, `nivelPromedio contiene "IPRL"` compilaría
   * y devolvería siempre falso, que es peor que fallar.
   */
  private verificarCompatibilidad(
    field: string,
    op: string,
    value: unknown,
    ruta: string,
  ): void {
    const kind: FieldKind | undefined = FIELD_KIND[field as Field];
    if (kind === undefined) {
      // Defensa en profundidad: el tipo `Record<Field, …>` ya impide llegar
      // aquí en compilación; esto cubre un campo que llegue por otra vía.
      throw new PredicateCompilationError(
        `El campo '${field}' no tiene tipo declarado; no se puede validar (${ruta})`,
        { ruta, field },
      );
    }
    const esColeccion = kind === 'collection';
    const esNumerico = kind === 'numeric';
    const opDePertenencia = op === 'contains' || op === 'not_contains';
    const opDeConteo = op.startsWith('count');
    const opDeOrden = ['>=', '<=', '>', '<'].includes(op);

    if ((opDePertenencia || opDeConteo) && !esColeccion) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo de colección; '${field}' no lo es (${ruta})`,
        { ruta, field, op },
      );
    }
    if (opDeOrden && !esNumerico) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo numérico; '${field}' no lo es (${ruta})`,
        { ruta, field, op },
      );
    }
    if ((opDeConteo || opDeOrden) && typeof value !== 'number') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${ruta} requiere un valor numérico, recibió ${typeof value}`,
        { ruta, op, tipoValor: typeof value },
      );
    }
    if (opDePertenencia && typeof value !== 'string') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${ruta} requiere un valor de texto, recibió ${typeof value}`,
        { ruta, op, tipoValor: typeof value },
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Evaluación
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resuelve un campo del DSL contra los hechos.
 *
 * Devuelve `null` cuando el dato no existe (caracterización sin
 * registrar). Los comparadores tratan `null` de forma que **no excluya**
 * ni active una excepción: una regla no puede dispararse por ausencia de
 * información, solo por información presente que la cumpla.
 */
function resolverCampo(field: Field, facts: DiagnosticFacts): unknown {
  if (field.startsWith('levelByDimension.')) {
    const dim = field.slice('levelByDimension.'.length);
    return (facts.levelByDimension as Record<string, number>)[dim] ?? null;
  }
  switch (field) {
    case 'bottleneck':
      return facts.bottlenecks;
    case 'gaps':
      return facts.gaps;
    case 'criticalImbalances':
      return facts.imbalances
        .filter((d) => d.classification === 'CRITICAL')
        .map((d) => `${d.left}-${d.right}`);
    case 'moderateImbalances':
      return facts.imbalances
        .filter((d) => d.classification === 'MODERATE')
        .map((d) => `${d.left}-${d.right}`);
    case 'averageLevel':
      return facts.averageLevel;
    case 'characterization.stage':
      return facts.characterization.stage;
    case 'characterization.sector':
      return facts.characterization.sector;
    case 'characterization.teamSize':
      return facts.characterization.teamSize;
    case 'characterization.academicLinkage':
      return facts.characterization.academicLinkage;
    default:
      return null;
  }
}

export function evaluarExpresion(
  expresion: ExpressionTree,
  facts: DiagnosticFacts,
): boolean {
  if (expresion.type !== 'leaf') {
    switch (expresion.type) {
      case 'and':
        return expresion.operands.every((o) => evaluarExpresion(o, facts));
      case 'or':
        return expresion.operands.some((o) => evaluarExpresion(o, facts));
      case 'not':
        return !evaluarExpresion(expresion.operands[0], facts);
    }
  }

  const actual = resolverCampo(expresion.field, facts);
  const esperado = expresion.value;

  switch (expresion.op) {
    case '=':
      return actual === esperado;
    case '!=':
      return actual !== esperado;
    case 'contains':
      return Array.isArray(actual) && actual.includes(esperado);
    case 'not_contains':
      return Array.isArray(actual) && !actual.includes(esperado);
    case 'count>=':
      return Array.isArray(actual) && actual.length >= (esperado as number);
    case 'count<=':
      return Array.isArray(actual) && actual.length <= (esperado as number);
    case 'count=':
      return Array.isArray(actual) && actual.length === (esperado as number);
    // Una comparación de orden contra un dato ausente es falsa, nunca
    // verdadera: la falta de información no dispara reglas.
    case '>=':
      return typeof actual === 'number' && actual >= (esperado as number);
    case '<=':
      return typeof actual === 'number' && actual <= (esperado as number);
    case '>':
      return typeof actual === 'number' && actual > (esperado as number);
    case '<':
      return typeof actual === 'number' && actual < (esperado as number);
    default:
      return false;
  }
}
