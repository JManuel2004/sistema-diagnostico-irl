import {
  CAMPOS_CONSULTABLES,
  OPERADORES_BOOLEANOS,
  type Campo,
  type HechosDiagnostico,
  type ModoCompilacion,
  type Operador,
} from '@innlab/contracts';
import { PredicateCompilationError } from '../errors/portfolio-routing.errors.js';

/**
 * Compilador y evaluador del DSL de predicados.
 *
 * Dos responsabilidades separadas a propósito:
 *
 *   - `compile()` valida la forma del predicado y lo convierte en un
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

export type ArbolExpresion =
  | { readonly tipo: 'hoja'; readonly campo: Campo; readonly op: Operador; readonly valor: unknown }
  | { readonly tipo: 'y' | 'o' | 'no'; readonly operandos: readonly ArbolExpresion[] };

const CAMPOS = new Set<string>(CAMPOS_CONSULTABLES);
const BOOLEANOS = new Set<string>(OPERADORES_BOOLEANOS);

/** Campos cuyo valor es una colección: admiten `contiene` y `conteo*`. */
const CAMPOS_COLECCION = new Set<string>([
  'cuelloBotella',
  'brechas',
  'desequilibriosCriticos',
  'desequilibriosModerados',
]);

/** Campos numéricos: admiten comparaciones de orden. */
const CAMPOS_NUMERICOS = new Set<string>([
  'nivelPromedio',
  'nivelPorDimension.TRL',
  'nivelPorDimension.CRL',
  'nivelPorDimension.BRL',
  'nivelPorDimension.IPRL',
  'nivelPorDimension.TmRL',
  'nivelPorDimension.FRL',
  'caracterizacion.tamanoEquipo',
]);

export class PredicateCompilerService {
  compile(predicado: unknown, modo: ModoCompilacion): ArbolExpresion {
    return this.compilarNodo(predicado, modo, 'raíz');
  }

  private compilarNodo(
    nodo: unknown,
    modo: ModoCompilacion,
    ruta: string,
  ): ArbolExpresion {
    if (typeof nodo !== 'object' || nodo === null) {
      throw new PredicateCompilationError(
        `Predicado malformado en ${ruta}: se esperaba un objeto`,
        { ruta, recibido: typeof nodo },
      );
    }

    const obj = nodo as Record<string, unknown>;
    const op = obj.op;

    if (typeof op !== 'string') {
      throw new PredicateCompilationError(
        `Predicado malformado en ${ruta}: falta el operador 'op'`,
        { ruta },
      );
    }

    if (op === 'y' || op === 'o' || op === 'no') {
      const operandos = obj.operandos;
      if (!Array.isArray(operandos) || operandos.length === 0) {
        throw new PredicateCompilationError(
          `El operador '${op}' en ${ruta} requiere al menos un operando`,
          { ruta, op },
        );
      }
      if (op === 'no' && operandos.length !== 1) {
        throw new PredicateCompilationError(
          `El operador 'no' en ${ruta} admite exactamente un operando, recibió ${operandos.length}`,
          { ruta, recibidos: operandos.length },
        );
      }
      return {
        tipo: op,
        operandos: operandos.map((hijo, i) =>
          this.compilarNodo(hijo, modo, `${ruta}.${op}[${i}]`),
        ),
      };
    }

    return this.compilarHoja(obj, op, modo, ruta);
  }

  private compilarHoja(
    obj: Record<string, unknown>,
    op: string,
    modo: ModoCompilacion,
    ruta: string,
  ): ArbolExpresion {
    const campo = obj.campo;

    if (typeof campo !== 'string' || !CAMPOS.has(campo)) {
      throw new PredicateCompilationError(
        `Campo desconocido '${String(campo)}' en ${ruta}. ` +
          `Los campos consultables son: ${CAMPOS_CONSULTABLES.join(', ')}`,
        { ruta, campo, disponibles: [...CAMPOS] },
      );
    }

    const esDeGrado = !BOOLEANOS.has(op);

    if (esDeGrado && modo === 'BOOLEANO') {
      throw new PredicateCompilationError(
        `El operador '${op}' expresa grado y no se admite en modo BOOLEANO (${ruta}). ` +
          'Las reglas de elegibilidad expresan imposibilidad, no grado: ' +
          'si la condición necesita comparar magnitudes, pertenece a la capa de excepciones.',
        { ruta, op, modo },
      );
    }

    if (!BOOLEANOS.has(op) && !this.esOperadorDeGradoConocido(op)) {
      throw new PredicateCompilationError(
        `Operador desconocido '${op}' en ${ruta}`,
        { ruta, op },
      );
    }

    this.verificarCompatibilidad(campo, op, obj.valor, ruta);

    return { tipo: 'hoja', campo: campo as Campo, op: op as Operador, valor: obj.valor };
  }

  private esOperadorDeGradoConocido(op: string): boolean {
    return ['>=', '<=', '>', '<', 'conteo>=', 'conteo<=', 'conteo='].includes(op);
  }

  /**
   * Comprueba que el operador tenga sentido para el campo y que el tipo
   * del valor case. Sin esto, `nivelPromedio contiene "IPRL"` compilaría
   * y devolvería siempre falso, que es peor que fallar.
   */
  private verificarCompatibilidad(
    campo: string,
    op: string,
    valor: unknown,
    ruta: string,
  ): void {
    const esColeccion = CAMPOS_COLECCION.has(campo);
    const esNumerico = CAMPOS_NUMERICOS.has(campo);
    const opDePertenencia = op === 'contiene' || op === 'no_contiene';
    const opDeConteo = op.startsWith('conteo');
    const opDeOrden = ['>=', '<=', '>', '<'].includes(op);

    if ((opDePertenencia || opDeConteo) && !esColeccion) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo de colección; '${campo}' no lo es (${ruta})`,
        { ruta, campo, op },
      );
    }
    if (opDeOrden && !esNumerico) {
      throw new PredicateCompilationError(
        `El operador '${op}' requiere un campo numérico; '${campo}' no lo es (${ruta})`,
        { ruta, campo, op },
      );
    }
    if ((opDeConteo || opDeOrden) && typeof valor !== 'number') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${ruta} requiere un valor numérico, recibió ${typeof valor}`,
        { ruta, op, tipoValor: typeof valor },
      );
    }
    if (opDePertenencia && typeof valor !== 'string') {
      throw new PredicateCompilationError(
        `El operador '${op}' en ${ruta} requiere un valor de texto, recibió ${typeof valor}`,
        { ruta, op, tipoValor: typeof valor },
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
function resolverCampo(campo: Campo, hechos: HechosDiagnostico): unknown {
  if (campo.startsWith('nivelPorDimension.')) {
    const dim = campo.slice('nivelPorDimension.'.length);
    return (hechos.nivelPorDimension as Record<string, number>)[dim] ?? null;
  }
  switch (campo) {
    case 'cuelloBotella':
      return hechos.cuellosBotella;
    case 'brechas':
      return hechos.brechas;
    case 'desequilibriosCriticos':
      return hechos.desequilibrios
        .filter((d) => d.clasificacion === 'CRITICO')
        .map((d) => `${d.izquierda}-${d.derecha}`);
    case 'desequilibriosModerados':
      return hechos.desequilibrios
        .filter((d) => d.clasificacion === 'MODERADO')
        .map((d) => `${d.izquierda}-${d.derecha}`);
    case 'nivelPromedio':
      return hechos.nivelPromedio;
    case 'caracterizacion.etapa':
      return hechos.caracterizacion.etapa;
    case 'caracterizacion.sector':
      return hechos.caracterizacion.sector;
    case 'caracterizacion.tamanoEquipo':
      return hechos.caracterizacion.tamanoEquipo;
    case 'caracterizacion.vinculacionAcademica':
      return hechos.caracterizacion.vinculacionAcademica;
    default:
      return null;
  }
}

export function evaluarExpresion(
  expresion: ArbolExpresion,
  hechos: HechosDiagnostico,
): boolean {
  if (expresion.tipo !== 'hoja') {
    switch (expresion.tipo) {
      case 'y':
        return expresion.operandos.every((o) => evaluarExpresion(o, hechos));
      case 'o':
        return expresion.operandos.some((o) => evaluarExpresion(o, hechos));
      case 'no':
        return !evaluarExpresion(expresion.operandos[0], hechos);
    }
  }

  const actual = resolverCampo(expresion.campo, hechos);
  const esperado = expresion.valor;

  switch (expresion.op) {
    case '=':
      return actual === esperado;
    case '!=':
      return actual !== esperado;
    case 'contiene':
      return Array.isArray(actual) && actual.includes(esperado);
    case 'no_contiene':
      return Array.isArray(actual) && !actual.includes(esperado);
    case 'conteo>=':
      return Array.isArray(actual) && actual.length >= (esperado as number);
    case 'conteo<=':
      return Array.isArray(actual) && actual.length <= (esperado as number);
    case 'conteo=':
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
