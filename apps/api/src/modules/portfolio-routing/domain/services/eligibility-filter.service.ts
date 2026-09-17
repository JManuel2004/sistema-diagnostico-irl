import type { DiagnosticFacts } from '@innlab/contracts';
import type { NumericProfile } from '../value-objects/ordinal-profile.vo.js';
import type { ExpressionTree } from './predicate-compiler.service.js';
import { evaluarExpresion } from './predicate-compiler.service.js';

/**
 * Capa 1 — filtro duro.
 *
 * Una regla de elegibilidad expresa imposibilidad, no preferencia: si se
 * cumple, el servicio queda fuera y ya no compite. No resta puntos, no
 * baja positions. Esa distinción es la razón de que el compilador
 * rechace operadores de comparación numérica en modo `BOOLEANO`: en el
 * momento en que una exclusión admite grado, deja de ser un filtro y
 * pertenece a la capa 2.
 *
 * Un servicio sin ninguna regla asociada es elegible por defecto.
 *
 * Servicio puro, sin IO ni decoradores.
 */
export interface CompiledEligibilityRule {
  readonly idRegla: string;
  readonly idService: number;
  readonly expresion: ExpressionTree;
  readonly exclusionMessage: string;
}

export interface ExcludedService {
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
      const aplicables = rules.filter((r) => r.idService === profile.idService);
      // La primera regla que se cumple excluye; el mensaje que se reporta
      // es el suyo, para que el reason mostrado sea el que efectivamente
      // dejó fuera al servicio.
      const disparada = aplicables.find((r) =>
        evaluarExpresion(r.expresion, facts),
      );

      if (disparada) {
        excluded.push({
          idService: profile.idService,
          name: profile.serviceName,
          exclusionMessage: disparada.exclusionMessage,
        });
      } else {
        eligible.push(profile);
      }
    }

    return { eligible, excluded };
  }
}
