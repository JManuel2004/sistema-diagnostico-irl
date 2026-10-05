import type { DiagnosticFacts, EXCEPTION_ACTIONS } from '@innlab/contracts';
import type {
  IncludedCandidate,
  RankedCandidate,
  ScoredCandidate,
} from '../value-objects/scored-candidate.vo.js';
import type { AdjustmentOnlyService } from '../value-objects/adjustment-only-service.vo.js';
import type { ExpressionTree } from './predicate-compiler.service.js';
import { evaluateExpression } from './predicate-compiler.service.js';

/**
 * Layer 3 — manual adjustments over the calculated ranking.
 *
 * This is where the center deliberately steps in: forcing a service,
 * vetoing it, or promoting or demoting it a few positions when the
 * calculation, however correct, does not capture a judgement call.
 *
 * It is also the only way an adjustment-only service reaches the ranking:
 * `INCLUDE` puts it at the position the rule sets (`positions`, 1 = first;
 * past the end, it goes last), without a score. From then on it is one more
 * place of the ranking, and later adjustments can move or veto it like any
 * other. `INCLUDE` only targets adjustment-only services; the database
 * enforces it, and a rule that still breaks it is discarded with the reason.
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
  /** Positions to move (PROMOTE, DEMOTE) or the position to enter at (INCLUDE). */
  readonly positions: number | null;
  readonly declaredReason: string;
}

export interface AppliedException {
  readonly code: string;
  readonly order: number;
  readonly action: ExceptionAction;
  readonly targetService: string;
  readonly declaredReason: string;
  readonly rankingBefore: readonly RankedCandidate[];
  readonly rankingAfter: readonly RankedCandidate[];
  readonly effect: string;
}

export interface DiscardedException {
  readonly code: string;
  readonly order: number;
  readonly reason: string;
}

export interface ExceptionResult {
  readonly finalRanking: readonly RankedCandidate[];
  readonly applied: readonly AppliedException[];
  readonly discarded: readonly DiscardedException[];
}

export class ExceptionEngineService {
  apply(
    initialRanking: readonly ScoredCandidate[],
    exceptions: readonly CompiledExceptionRule[],
    facts: DiagnosticFacts,
    adjustmentOnlyServices: readonly AdjustmentOnlyService[] = [],
  ): ExceptionResult {
    const applied: AppliedException[] = [];
    const discarded: DiscardedException[] = [];
    let ranking: RankedCandidate[] = [...initialRanking];

    const ordered = [...exceptions].sort(
      (a, b) => a.priorityOrder - b.priorityOrder,
    );

    for (const rule of ordered) {
      const discard = (reason: string) =>
        discarded.push({ code: rule.code, order: rule.priorityOrder, reason });

      if (!evaluateExpression(rule.expression, facts)) {
        discard('La condición no se cumple para este diagnóstico');
        continue;
      }

      const index = ranking.findIndex(
        (c) => c.idService === rule.idTargetService,
      );
      const before = [...ranking];

      if (rule.action === 'INCLUDE') {
        const service = adjustmentOnlyServices.find(
          (s) => s.idService === rule.idTargetService,
        );
        if (!service) {
          discard(
            'La condición se cumple, pero el servicio objetivo no es de los que solo entran ' +
              'por ajuste',
          );
          continue;
        }
        if (index !== -1) {
          discard(
            'La condición se cumple, pero el servicio ya está en el ranking',
          );
          continue;
        }
        const { next, effect } = include(ranking, service, rule);
        ranking = next;
        applied.push({
          code: rule.code,
          order: rule.priorityOrder,
          action: rule.action,
          targetService: service.serviceName,
          declaredReason: rule.declaredReason,
          rankingBefore: before,
          rankingAfter: [...ranking],
          effect,
        });
        continue;
      }

      if (index === -1) {
        // The target is not in the ranking: it was excluded in layer 1, vetoed
        // by an earlier exception, or it is an adjustment-only service no
        // earlier adjustment included. It is discarded with an explicit reason
        // instead of failing silently.
        discard(
          'La condición se cumple, pero el servicio objetivo no está en el ranking ' +
            '(excluido por elegibilidad, vetado por un ajuste anterior o no incluido por ninguno)',
        );
        continue;
      }

      const { next, effect } = this.applyAction(ranking, index, {
        ...rule,
        action: rule.action,
      });
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
    ranking: readonly RankedCandidate[],
    index: number,
    rule: CompiledExceptionRule & { readonly action: RankingAction },
  ): { next: RankedCandidate[]; effect: string } {
    const list = [...ranking];
    const [target] = list.splice(index, 1);
    return RANKING_STRATEGIES[rule.action]({ list, target, index, rule });
  }
}

/**
 * Puts an adjustment-only service at the position the rule sets (1-based),
 * or last if the ranking is shorter. It enters without a score.
 */
function include(
  ranking: readonly RankedCandidate[],
  service: AdjustmentOnlyService,
  rule: CompiledExceptionRule,
): { next: RankedCandidate[]; effect: string } {
  const list = [...ranking];
  const destination = Math.min(
    Math.max((rule.positions ?? list.length + 1) - 1, 0),
    list.length,
  );
  const candidate: IncludedCandidate = {
    idService: service.idService,
    serviceName: service.serviceName,
    includedBy: { ruleCode: rule.code, declaredReason: rule.declaredReason },
  };
  list.splice(destination, 0, candidate);
  return {
    next: list,
    effect: `${service.serviceName} entra al ranking en el puesto ${destination + 1}, sin puntaje`,
  };
}

/** What a strategy receives: the ranking without the target, and the target. */
interface ActionContext {
  /** The ranking with the target already removed. */
  readonly list: RankedCandidate[];
  readonly target: RankedCandidate;
  /** Position (0-based) the target had before the action. */
  readonly index: number;
  readonly rule: CompiledExceptionRule;
}

type ActionStrategy = (ctx: ActionContext) => {
  next: RankedCandidate[];
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

/** The actions that move a place of the ranking; `INCLUDE` adds one. */
type RankingAction = Exclude<ExceptionAction, 'INCLUDE'>;

/**
 * One strategy per ranking action — the extension point of the exception
 * layer.
 *
 * Typed as `Record<RankingAction, …>`, and `RankingAction` is every action
 * of `EXCEPTION_ACTIONS` except `INCLUDE`: adding an action to the contracts
 * fails to compile here until its strategy exists; there is no switch to
 * remember and no fallthrough that silently ignores a new action. To add
 * one: (1) the constant in the contracts, (2) its strategy below, (3) the
 * migration's `ck_exception_rule_action` (and `_positions`) constraints.
 */
const RANKING_STRATEGIES: Record<RankingAction, ActionStrategy> = {
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
