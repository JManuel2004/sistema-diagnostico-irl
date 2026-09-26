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
 * Compiler and evaluator of the predicate DSL.
 *
 * Two responsibilities, deliberately separate:
 *
 *   - `compile()` validates the shape of the predicate and turns it into a
 *     typed tree. It runs when **configuring**: an unknown field or an
 *     operator not allowed in the mode fails here, when someone writes the
 *     rule, not months later when a real diagnostic triggers it. That
 *     difference in timing is the whole value of compiling.
 *
 *   - `evaluateExpression()` walks the already compiled tree against some
 *     facts. It validates nothing: it trusts that the tree went through the
 *     compiler, which is what the repository guarantees when reading.
 *
 * The mode is what structurally keeps a degree condition out of the hard
 * filter. In `BOOLEAN` only equality and membership are allowed; `>=`, `<`,
 * `count>=` and the like are rejected. It is not a convention someone has
 * to remember: the rule does not compile.
 *
 * Pure service, no IO and no decorators.
 */

export type ExpressionTree =
  | { readonly type: 'leaf'; readonly field: Field; readonly op: Operator; readonly value: unknown }
  | { readonly type: 'and' | 'or' | 'not'; readonly operands: readonly ExpressionTree[] };

const QUERYABLE = new Set<string>(QUERYABLE_FIELDS);
const BOOLEAN_OPS = new Set<string>(BOOLEAN_OPERATORS);

/**
 * How each queryable field behaves, which decides the operators it
 * accepts:
 *   - `collection`: its value is a collection; accepts `contains` and `count*`.
 *   - `numeric`: accepts order comparisons.
 *   - `scalar`: text or boolean; equality only.
 *
 * Typed as `Record<Field, …>` on purpose: adding a field to
 * `QUERYABLE_FIELDS` in `@innlab/contracts` does not compile until its kind
 * is declared here. They used to be two parallel `Set`s, and a new field
 * that fell in neither was silently accepted, without the expected type
 * validation.
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
  compile(predicate: unknown, mode: CompilationMode): ExpressionTree {
    return this.compileNode(predicate, mode, 'root');
  }

  private compileNode(
    node: unknown,
    mode: CompilationMode,
    path: string,
  ): ExpressionTree {
    if (typeof node !== 'object' || node === null) {
      throw new PredicateCompilationError(
        `Predicate malformado en ${path}: se esperaba un objeto`,
        { path, received: typeof node },
      );
    }

    const obj = node as Record<string, unknown>;
    const op = obj.op;

    if (typeof op !== 'string') {
      throw new PredicateCompilationError(
        `Predicate malformado en ${path}: falta el operador 'op'`,
        { path },
      );
    }

    if (op === 'and' || op === 'or' || op === 'not') {
      const operands = obj.operands;
      if (!Array.isArray(operands) || operands.length === 0) {
        throw new PredicateCompilationError(
          `El operador '${op}' en ${path} requiere al menos un operando`,
          { path, op },
        );
      }
      if (op === 'not' && operands.length !== 1) {
        throw new PredicateCompilationError(
          `El operador 'not' en ${path} admite exactamente un operando, recibió ${operands.length}`,
          { path, received: operands.length },
        );
      }
      return {
        type: op,
        operands: operands.map((child, i) =>
          this.compileNode(child, mode, `${path}.${op}[${i}]`),
        ),
      };
    }

    return this.compileLeaf(obj, op, mode, path);
  }

  private compileLeaf(
    obj: Record<string, unknown>,
    op: string,
    mode: CompilationMode,
    path: string,
  ): ExpressionTree {
    const field = obj.field;

    if (typeof field !== 'string' || !QUERYABLE.has(field)) {
      throw new PredicateCompilationError(
        `Campo desconocido '${String(field)}' en ${path}. ` +
          `Los campos consultables son: ${QUERYABLE_FIELDS.join(', ')}`,
        { path, field, available: [...QUERYABLE] },
      );
    }

    const isDegree = !BOOLEAN_OPS.has(op);

    if (isDegree && mode === 'BOOLEAN') {
      throw new PredicateCompilationError(
        `El operador '${op}' expresa grado y no se admite en modo BOOLEAN (${path}). ` +
          'Las reglas de elegibilidad expresan imposibilidad, no grado: ' +
          'si la condición necesita comparar magnitudes, pertenece a la capa de excepciones.',
        { path, op, mode },
      );
    }

    if (!BOOLEAN_OPS.has(op) && !this.isKnownDegreeOperator(op)) {
      throw new PredicateCompilationError(
        `Operador desconocido '${op}' en ${path}`,
        { path, op },
      );
    }

    this.checkCompatibility(field, op, obj.value, path);

    return { type: 'leaf', field: field as Field, op: op as Operator, value: obj.value };
  }

  private isKnownDegreeOperator(op: string): boolean {
    return ['>=', '<=', '>', '<', 'count>=', 'count<=', 'count='].includes(op);
  }

  /**
   * Checks that the operator makes sense for the field and that the value's
   * type matches. Without this, `averageLevel contains "IPRL"` would compile
   * and always return false, which is worse than failing.
   */
  private checkCompatibility(
    field: string,
    op: string,
    value: unknown,
    path: string,
  ): void {
    const kind: FieldKind | undefined = FIELD_KIND[field as Field];
    if (kind === undefined) {
      // Defense in depth: the `Record<Field, …>` type already prevents getting
      // here at compile time; this covers a field that arrives another way.
      throw new PredicateCompilationError(
        `El campo '${field}' no tiene tipo declarado; no se puede validar (${path})`,
        { path, field },
      );
    }
    const isCollection = kind === 'collection';
    const isNumeric = kind === 'numeric';
    const isMembershipOp = op === 'contains' || op === 'not_contains';
    const isCountOp = op.startsWith('count');
    const isOrderOp = ['>=', '<=', '>', '<'].includes(op);

    if ((isMembershipOp || isCountOp) && !isCollection) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo de colección; '${field}' no lo es (${path})`,
        { path, field, op },
      );
    }
    if (isOrderOp && !isNumeric) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo numérico; '${field}' no lo es (${path})`,
        { path, field, op },
      );
    }
    if ((isCountOp || isOrderOp) && typeof value !== 'number') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${path} requiere un valor numérico, recibió ${typeof value}`,
        { path, op, valueType: typeof value },
      );
    }
    if (isMembershipOp && typeof value !== 'string') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${path} requiere un valor de texto, recibió ${typeof value}`,
        { path, op, valueType: typeof value },
      );
    }
  }
}

// ─────────────────────────────────────────────────────────────────────────
// Evaluation
// ─────────────────────────────────────────────────────────────────────────

/**
 * Resolves a DSL field against the facts.
 *
 * Returns `null` when the datum does not exist (characterization not
 * registered). The comparators treat `null` so that it **neither excludes**
 * nor triggers an exception: a rule can never fire because of missing
 * information, only because of present information that satisfies it.
 */
function resolveField(field: Field, facts: DiagnosticFacts): unknown {
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

export function evaluateExpression(
  expression: ExpressionTree,
  facts: DiagnosticFacts,
): boolean {
  if (expression.type !== 'leaf') {
    switch (expression.type) {
      case 'and':
        return expression.operands.every((o) => evaluateExpression(o, facts));
      case 'or':
        return expression.operands.some((o) => evaluateExpression(o, facts));
      case 'not':
        return !evaluateExpression(expression.operands[0], facts);
    }
  }

  const current = resolveField(expression.field, facts);
  const expected = expression.value;

  switch (expression.op) {
    case '=':
      return current === expected;
    case '!=':
      return current !== expected;
    case 'contains':
      return Array.isArray(current) && current.includes(expected);
    case 'not_contains':
      return Array.isArray(current) && !current.includes(expected);
    case 'count>=':
      return Array.isArray(current) && current.length >= (expected as number);
    case 'count<=':
      return Array.isArray(current) && current.length <= (expected as number);
    case 'count=':
      return Array.isArray(current) && current.length === (expected as number);
    // An order comparison against a missing datum is false, never true:
    // missing information does not fire rules.
    case '>=':
      return typeof current === 'number' && current >= (expected as number);
    case '<=':
      return typeof current === 'number' && current <= (expected as number);
    case '>':
      return typeof current === 'number' && current > (expected as number);
    case '<':
      return typeof current === 'number' && current < (expected as number);
    default:
      return false;
  }
}
