import { DIMENSIONS } from './dimensions.js';

/**
 * Dependency graph between IRL dimensions — input to the scaling
 * roadmap (RF-14).
 *
 * An edge `source → target` with `minimumRequiredLevel = n` states:
 * *"target cannot progress sustainably while source has not reached
 * level n"*. The engine topologically orders the subgraph of the
 * dimensions that need work and produces the phases.
 *
 * ⚠ THE NINE EDGES ARE HYPOTHETICAL AND NOT VALIDATED BY INNLAB.
 *
 * That validation matters more than it looks: the graph encodes a
 * methodological claim, and no automated check can judge whether it is
 * correct. The guards in this file verify the *shape* of the graph
 * (acyclic, no reflexive or duplicated edges, levels in range); they do
 * not verify its *content*. If an edge were wrongly declared, the graph
 * would still be a valid DAG, the seed would pass, the tests would stay
 * green, and the system would order the phases wrongly with a readable
 * and mistaken justification.
 *
 * That is why each edge carries the reasoning behind it below:
 * reviewing them with INNLAB should be a read, not an excavation.
 */
export interface DimensionDependencySeed {
  readonly source: string;
  readonly target: string;
  readonly minimumRequiredLevel: number;
  /** Why this dependency is claimed. For review with INNLAB. */
  readonly reason: string;
}

export const DIMENSION_DEPENDENCIES: readonly DimensionDependencySeed[] = [
  {
    source: 'TmRL',
    target: 'TRL',
    minimumRequiredLevel: 3,
    reason:
      'Sin un equipo con competencias técnicas mínimas no hay quien sostenga el desarrollo del producto.',
  },
  {
    source: 'TmRL',
    target: 'CRL',
    minimumRequiredLevel: 3,
    reason:
      'La validación con clientes exige dedicación sostenida de alguien del equipo; sin equipo no hay descubrimiento.',
  },
  {
    source: 'TmRL',
    target: 'BRL',
    minimumRequiredLevel: 3,
    reason:
      'Diseñar y probar un modelo de negocio requiere criterio y tiempo del equipo fundador.',
  },
  {
    source: 'TRL',
    target: 'CRL',
    minimumRequiredLevel: 3,
    reason:
      'No se puede validar la disposición a adoptar sin algo funcional que el cliente pueda usar.',
  },
  {
    source: 'TRL',
    target: 'IPRL',
    minimumRequiredLevel: 4,
    reason:
      'Proteger propiedad intelectual exige que la solución técnica esté suficientemente definida para delimitar qué se protege.',
  },
  {
    source: 'CRL',
    target: 'BRL',
    minimumRequiredLevel: 4,
    reason:
      'Un modelo de negocio sin segmento de cliente validado se construye sobre supuestos, no sobre evidencia.',
  },
  {
    source: 'CRL',
    target: 'FRL',
    minimumRequiredLevel: 4,
    reason:
      'Ningún financiador evalúa favorablemente una iniciativa que no ha demostrado demanda.',
  },
  {
    source: 'IPRL',
    target: 'FRL',
    minimumRequiredLevel: 4,
    reason:
      'La debida diligencia de inversión revisa la titularidad y la libertad de operación de los intangibles.',
  },
  {
    source: 'BRL',
    target: 'FRL',
    minimumRequiredLevel: 3,
    reason:
      'Sin proyecciones ni estructura de ingresos no hay cómo sustentar una solicitud de capital.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Import-time guards
// ─────────────────────────────────────────────────────────────────────────
//
// They follow the precedent of `statements.ts`, which throws on import
// if there are not 48 statements. They turn a configuration error into a
// seed startup failure instead of a 500 in front of a user months later.

const VALID_CODES = new Set(DIMENSIONS.map((d) => d.code as string));

for (const edge of DIMENSION_DEPENDENCIES) {
  for (const [role, code] of [
    ['source', edge.source],
    ['target', edge.target],
  ] as const) {
    if (!VALID_CODES.has(code)) {
      throw new Error(
        `Invalid dependency: '${code}' (${role}) is not a framework dimension. ` +
          `Valid ones: ${[...VALID_CODES].join(', ')}. ` +
          `Mind the lowercase m in 'TmRL'.`,
      );
    }
  }
  if (edge.source === edge.target) {
    throw new Error(
      `Reflexive dependency: '${edge.source}' cannot depend on itself`,
    );
  }
  if (
    edge.minimumRequiredLevel < 1 ||
    edge.minimumRequiredLevel > 9 ||
    !Number.isInteger(edge.minimumRequiredLevel)
  ) {
    throw new Error(
      `Required level outside [1,9] in ${edge.source}→${edge.target}: ` +
        `${edge.minimumRequiredLevel}`,
    );
  }
}

const pairs = DIMENSION_DEPENDENCIES.map((a) => `${a.source}->${a.target}`);
const duplicates = pairs.filter((p, i) => pairs.indexOf(p) !== i);
if (duplicates.length > 0) {
  throw new Error(
    `Duplicated dependencies: ${[...new Set(duplicates)].join(', ')}`,
  );
}

/**
 * The guard that matters most: the declared graph has to be acyclic.
 *
 * It is solved with the same layering algorithm as the engine (Kahn),
 * but written here independently and on purpose: if the engine had a
 * bug in its cycle detection, a guard that reused it would inherit that
 * same bug and detect nothing.
 */
const inDegree = new Map<string, number>(
  [...VALID_CODES].map((c) => [c, 0]),
);
for (const a of DIMENSION_DEPENDENCIES) {
  inDegree.set(a.target, (inDegree.get(a.target) ?? 0) + 1);
}

const remaining = new Set(VALID_CODES);
let progress = true;
while (remaining.size > 0 && progress) {
  const withoutIncoming = [...remaining].filter((d) => inDegree.get(d) === 0);
  progress = withoutIncoming.length > 0;
  for (const d of withoutIncoming) {
    remaining.delete(d);
    for (const a of DIMENSION_DEPENDENCIES) {
      if (a.source === d && remaining.has(a.target)) {
        inDegree.set(a.target, (inDegree.get(a.target) ?? 1) - 1);
      }
    }
  }
}

if (remaining.size > 0) {
  throw new Error(
    `The dependency graph has a cycle. Dimensions involved: ` +
      `${[...remaining].sort().join(', ')}. ` +
      `A cycle makes ordering the roadmap phases impossible.`,
  );
}

if (DIMENSION_DEPENDENCIES.length !== 9) {
  throw new Error(
    `Expected 9 declared dependencies; there are ${DIMENSION_DEPENDENCIES.length}`,
  );
}
