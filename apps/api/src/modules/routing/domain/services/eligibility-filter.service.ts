import type { DiagnosticFacts } from '@innlab/contracts';
import type { NumericProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ExpressionTree } from './predicate-compiler.service.js';
import { evaluateExpression } from './predicate-compiler.service.js';

/**
 * Layer 1 — hard filter.
 *
 * An eligibility rule expresses impossibility, not preference: if it holds,
 * the service is out and no longer competes. It does not subtract points or
 * lower positions. That distinction is why the compiler rejects numeric
 * comparison operators in `BOOLEAN` mode: the moment an exclusion admits a
 * degree, it stops being a filter and belongs to layer 2.
 *
 * A service with no associated rule is eligible by default.
 *
 * Pure service, no IO and no decorators.
 */
export interface CompiledEligibilityRule {
  /** Stable code of the rule (`ELG-02`), recorded in the trace. */
  readonly code: string;
  readonly idService: number;
  readonly expression: ExpressionTree;
  readonly exclusionMessage: string;
}

export interface ExcludedService {
  /** The rule that excluded the service. */
  readonly ruleCode: string;
  readonly idService: number;
  readonly name: string;
  readonly exclusionMessage: string;
}

export interface EligibilityResult {
  readonly eligible: readonly NumericProfile[];
  readonly excluded: readonly ExcludedService[];
}

export class EligibilityFilterService {
  filter(
    profiles: readonly NumericProfile[],
    rules: readonly CompiledEligibilityRule[],
    facts: DiagnosticFacts,
  ): EligibilityResult {
    const eligible: NumericProfile[] = [];
    const excluded: ExcludedService[] = [];

    for (const profile of profiles) {
      const applicable = rules.filter((r) => r.idService === profile.idService);
      // The first rule that holds excludes; the reported message is its own,
      // so the reason shown is the one that actually left the service out.
      const fired = applicable.find((r) =>
        evaluateExpression(r.expression, facts),
      );

      if (fired) {
        excluded.push({
          ruleCode: fired.code,
          idService: profile.idService,
          name: profile.serviceName,
          exclusionMessage: fired.exclusionMessage,
        });
      } else {
        eligible.push(profile);
      }
    }

    return { eligible, excluded };
  }
}
