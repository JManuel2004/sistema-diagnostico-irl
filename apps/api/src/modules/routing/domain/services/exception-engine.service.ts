import type { DiagnosticFacts, EXCEPTION_ACTIONS } from '@innlab/contracts';
import type { ScoredCandidate } from '../value-objects/scored-candidate.vo.js';
import type { ExpressionTree } from './predicate-compiler.service.js';
import { evaluateExpression } from './predicate-compiler.service.js';

/**
 * Layer 3 — manual adjustments over the calculated ranking.
 *
 * This is where the center deliberately steps in: forcing a service,
 * vetoing it, or promoting or demoting it a few positions when the
 * calculation, however correct, does not capture a judgement call.
 *
 * Exceptions are walked in ascending `priorityOrder`. That order is unique
 * by database constraint, so the cascade is total and deterministic: there
 * are no ties to resolve and no dependency on the order in which the
 * database returns the rows.
 *
 * ── The risk this layer introduces ─────────────────────────────────────
 *
 * An exception written for a general pattern can displace a service the
 * calculation had identified well, because two different scenarios trigger
 * the same condition. The system cannot resolve that automatically: it is a
 * content problem, not a form problem.
 *
 * What it does do, and why it is built this way:
 *   - it records the ranking before and after **each** exception, not only
 *     the final result, so the effect of each one is attributable;
 *   - it also records the discarded ones and why, so that "nothing happened"
 *     is a verifiable statement and not an absence of information.
 */
export type ExceptionAction = (typeof EXCEPTION_ACTIONS)[number];

export interface CompiledExceptionRule {
  readonly code: string;
  readonly priorityOrder: number;
  readonly expression: ExpressionTree;
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
  readonly finalRanking: readonly ScoredCandidate[];
  readonly applied: readonly AppliedException[];
  readonly discarded: readonly DiscardedException[];
}

export class ExceptionEngineService {
  apply(
    initialRanking: readonly ScoredCandidate[],
    exceptions: readonly CompiledExceptionRule[],
    facts: DiagnosticFacts,
  ): ExceptionResult {
    const applied: AppliedException[] = [];
    const discarded: DiscardedException[] = [];
    let ranking: ScoredCandidate[] = [...initialRanking];

    const ordered = [...exceptions].sort(
      (a, b) => a.priorityOrder - b.priorityOrder,
    );

    for (const rule of ordered) {
      if (!evaluateExpression(rule.expression, facts)) {
        discarded.push({
          code: rule.code,
          order: rule.priorityOrder,
          reason: 'La condición no se cumple para este diagnóstico',
        });
        continue;
      }

      const index = ranking.findIndex(
        (c) => c.idService === rule.idTargetService,
      );

      if (index === -1) {
        // The target is not in the ranking: it was excluded in layer 1 or
        // vetoed by an earlier exception. It is discarded with an explicit
        // reason instead of failing silently — exactly the conflict between
        // layers that the validator must catch when configuring.
        discarded.push({
          code: rule.code,
          order: rule.priorityOrder,
          reason:
            'La condición se cumple, pero el servicio objetivo no está en el ranking ' +
            '(excluido por elegibilidad o vetado por una excepción anterior)',
        });
        continue;
      }

      const before = [...ranking];
      const { next, effect } = this.applyAction(ranking, index, rule);
      ranking = next;

      applied.push({
        code: rule.code,
        order: rule.priorityOrder,
        action: rule.action,
        targetService: before[index].serviceName,
        declaredReason: rule.declaredReason,
        rankingBefore: before,
        rankingAfter: [...ranking],
        effect,
      });
    }

    return { finalRanking: ranking, applied, discarded };
  }

  private applyAction(
    ranking: readonly ScoredCandidate[],
    index: number,
    rule: CompiledExceptionRule,
  ): { next: ScoredCandidate[]; effect: string } {
    const list = [...ranking];
    const [target] = list.splice(index, 1);
    return ACTION_STRATEGIES[rule.action]({ list, target, index, rule });
  }
}

/** What a strategy receives: the ranking without the target, and the target. */
interface ActionContext {
  /** The ranking with the target already removed. */
  readonly list: ScoredCandidate[];
  readonly target: ScoredCandidate;
  /** Position (0-based) the target had before the action. */
  readonly index: number;
  readonly rule: CompiledExceptionRule;
}

type ActionStrategy = (ctx: ActionContext) => {
  next: ScoredCandidate[];
  effect: string;
};

function moveBy(direction: 'up' | 'down'): ActionStrategy {
  return ({ list, target, index, rule }) => {
    const step = rule.positions ?? 0;
    const delta = direction === 'up' ? -step : step;
    // Saturation at the ends: promoting 3 from position 2 leaves it in
    // position 1, not at a negative index.
    const destination = Math.max(0, Math.min(list.length, index + delta));
    list.splice(destination, 0, target);
    const verb = direction === 'up' ? 'sube' : 'baja';
    const name = target.serviceName;
    return {
      next: list,
      effect:
        destination === index
          ? `${name} se mantiene en el puesto ${index + 1} (ya estaba en el extremo)`
          : `${name} ${verb} del puesto ${index + 1} al puesto ${destination + 1}`,
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
 * `ck_exception_rule_action` (and `_positions`) constraints.
 */
const ACTION_STRATEGIES: Record<ExceptionAction, ActionStrategy> = {
  FORCE: ({ list, target, index }) => {
    list.unshift(target);
    const name = target.serviceName;
    return {
      next: list,
      effect:
        index === 0
          ? `${name} ya ocupaba el puesto 1; la excepción lo fija explícitamente`
          : `${name} pasa del puesto ${index + 1} al puesto 1`,
    };
  },
  VETO: ({ list, target, index }) => ({
    next: list,
    effect: `${target.serviceName} se retira del ranking (estaba en el puesto ${index + 1})`,
  }),
  PROMOTE: moveBy('up'),
  DEMOTE: moveBy('down'),
};
