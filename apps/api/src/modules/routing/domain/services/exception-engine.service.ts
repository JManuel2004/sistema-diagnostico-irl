import type { DiagnosticFacts, EXCEPTION_ACTIONS } from '@innlab/contracts';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';
import type { ExpressionTree } from './predicate-compiler.service.js';
import { evaluarExpresion } from './predicate-compiler.service.js';

/**
 * Capa 3 — ajustes puntuales sobre el ranking calculado.
 *
 * Aquí es donde el centro interviene deliberadamente: forzar un servicio,
 * vetarlo, promoverlo o degradarlo unas positions cuando el cálculo, por
 * correcto que sea, no captura una consideración de criterio.
 *
 * Las excepciones se recorren en orden `priorityOrder` ascendente. Ese
 * orden es único dentro de una versión por restricción de base de datos,
 * así que la cascada es total y determinista: no hay empates que resolver
 * ni dependencia del orden en que la base devuelva las filas.
 *
 * ── El riesgo que esta capa introduce ──────────────────────────────────
 *
 * Una excepción escrita para un patrón general puede desplazar a un
 * servicio que el cálculo había identificado bien, porque dos escenarios
 * distintos activan la misma condición. El sistema no puede resolver eso
 * automáticamente: es un problema de contenido, no de forma.
 *
 * Lo que sí hace, y por eso está construido así:
 *   - registra el ranking antes y después de **cada** excepción, no solo
 *     el resultado final, de modo que el efecto de una sea atribuible;
 *   - registra también las descartadas y por qué, para que "no pasó nada"
 *     sea una afirmación verificable y no una ausencia de información.
 */
export type ExceptionAction = (typeof EXCEPTION_ACTIONS)[number];

export interface CompiledExceptionRule {
  readonly code: string;
  readonly priorityOrder: number;
  readonly expresion: ExpressionTree;
  readonly action: ExceptionAction;
  readonly idTargetService: number;
  readonly positions: number | null;
  readonly declaredReason: string;
}

export interface AppliedException {
  readonly code: string;
  readonly order: number;
  readonly action: ExceptionAction;
  readonly targetService: string;
  readonly declaredReason: string;
  readonly rankingBefore: readonly ScoredCandidate[];
  readonly rankingAfter: readonly ScoredCandidate[];
  readonly effect: string;
}

export interface DiscardedException {
  readonly code: string;
  readonly order: number;
  readonly reason: string;
}

export interface ExceptionResult {
  readonly rankingPost: readonly ScoredCandidate[];
  readonly applied: readonly AppliedException[];
  readonly discarded: readonly DiscardedException[];
}

export class ExceptionEngineService {
  apply(
    rankingPre: readonly ScoredCandidate[],
    exceptions: readonly CompiledExceptionRule[],
    facts: DiagnosticFacts,
  ): ExceptionResult {
    const applied: AppliedException[] = [];
    const discarded: DiscardedException[] = [];
    let ranking: ScoredCandidate[] = [...rankingPre];

    const enOrden = [...exceptions].sort(
      (a, b) => a.priorityOrder - b.priorityOrder,
    );

    for (const rule of enOrden) {
      if (!evaluarExpresion(rule.expresion, facts)) {
        discarded.push({
          code: rule.code,
          order: rule.priorityOrder,
          reason: 'La condición no se cumple para este diagnóstico',
        });
        continue;
      }

      const indice = ranking.findIndex(
        (c) => c.idService === rule.idTargetService,
      );

      if (indice === -1) {
        // El objetivo no está en el ranking: quedó excluido en la capa 1 o
        // vetado por una excepción anterior. Se descarta con reason
        // explícito en vez de fallar en silencio — es justo el conflicto
        // entre capas que el validador debe detectar al configurar.
        discarded.push({
          code: rule.code,
          order: rule.priorityOrder,
          reason:
            'La condición se cumple, pero el servicio objetivo no está en el ranking ' +
            '(excluido por elegibilidad o vetado por una excepción anterior)',
        });
        continue;
      }

      const antes = [...ranking];
      const { siguiente, effect } = this.aplicarAccion(ranking, indice, rule);
      ranking = siguiente;

      applied.push({
        code: rule.code,
        order: rule.priorityOrder,
        action: rule.action,
        targetService: antes[indice].serviceName,
        declaredReason: rule.declaredReason,
        rankingBefore: antes,
        rankingAfter: [...ranking],
        effect,
      });
    }

    return { rankingPost: ranking, applied, discarded };
  }

  private aplicarAccion(
    ranking: readonly ScoredCandidate[],
    indice: number,
    rule: CompiledExceptionRule,
  ): { siguiente: ScoredCandidate[]; effect: string } {
    const list = [...ranking];
    const [objetivo] = list.splice(indice, 1);
    return ACTION_STRATEGIES[rule.action]({ list, objetivo, indice, rule });
  }
}

/** What a strategy receives: the ranking without the target, and the target. */
interface ActionContext {
  /** The ranking with the target already removed. */
  readonly list: ScoredCandidate[];
  readonly objetivo: ScoredCandidate;
  /** Position (0-based) the target had before the action. */
  readonly indice: number;
  readonly rule: CompiledExceptionRule;
}

type ActionStrategy = (ctx: ActionContext) => {
  siguiente: ScoredCandidate[];
  effect: string;
};

function moveBy(direction: 'up' | 'down'): ActionStrategy {
  return ({ list, objetivo, indice, rule }) => {
    const salto = rule.positions ?? 0;
    const delta = direction === 'up' ? -salto : salto;
    // Saturación en los extremos: promover 3 desde el puesto 2 deja
    // el puesto 1, no un índice negativo.
    const destino = Math.max(0, Math.min(list.length, indice + delta));
    list.splice(destino, 0, objetivo);
    const verbo = direction === 'up' ? 'sube' : 'baja';
    const name = objetivo.serviceName;
    return {
      siguiente: list,
      effect:
        destino === indice
          ? `${name} se mantiene en el puesto ${indice + 1} (ya estaba en el extremo)`
          : `${name} ${verbo} del puesto ${indice + 1} al puesto ${destino + 1}`,
    };
  };
}

/**
 * One strategy per action — the extension point of the exception layer.
 *
 * Typed as `Record<ExceptionAction, …>`, so adding an action to
 * `EXCEPTION_ACTIONS` in `@innlab/contracts` fails to compile here until its
 * strategy exists; there is no switch to remember and no fallthrough that
 * silently ignores a new action. To add one: (1) the constant in the
 * contracts, (2) its strategy below, (3) a migration widening the
 * `ck_published_exception_rule_action` (and `_positions`) constraints.
 */
const ACTION_STRATEGIES: Record<ExceptionAction, ActionStrategy> = {
  FORCE: ({ list, objetivo, indice }) => {
    list.unshift(objetivo);
    const name = objetivo.serviceName;
    return {
      siguiente: list,
      effect:
        indice === 0
          ? `${name} ya ocupaba el puesto 1; la excepción lo fija explícitamente`
          : `${name} pasa del puesto ${indice + 1} al puesto 1`,
    };
  },
  VETO: ({ list, objetivo, indice }) => ({
    siguiente: list,
    effect: `${objetivo.serviceName} se retira del ranking (estaba en el puesto ${indice + 1})`,
  }),
  PROMOTE: moveBy('up'),
  DEMOTE: moveBy('down'),
};
