import { DIMENSIONS } from './dimensions.js';

/**
 * Grafo de dependencias entre dimensiones IRL — insumo del roadmap de
 * escalamiento (RF-14).
 *
 * Una arista `origen → destino` con `nivelMinimoRequerido = n` afirma:
 * *"destino no puede progresar de forma sostenible mientras origen no
 * alcance el nivel n"*. El motor ordena topológicamente el subgrafo de
 * las dimensiones que hay que intervenir y produce las fases.
 *
 * ⚠ LAS NUEVE ARISTAS SON HIPOTÉTICAS Y NO ESTÁN VALIDADAS POR INNLAB.
 *
 * Y esa validación importa más de lo que parece: el grafo codifica una
 * afirmación metodológica, y ninguna comprobación automática puede
 * juzgar si es correcta. Las guardas de este archivo verifican la
 * *forma* del grafo (que sea acíclico, sin aristas reflexivas ni
 * duplicadas, con niveles en rango); no verifican su *contenido*. Si una
 * arista estuviera mal declarada, el grafo seguiría siendo un DAG
 * válido, el seed pasaría, los tests seguirían en verde, y el sistema
 * ordenaría mal las fases con una justificación legible y equivocada.
 *
 * Por eso cada arista lleva abajo el razonamiento que la sustenta:
 * revisarlas con INNLAB debe ser una lectura, no una arqueología.
 */
export interface DimensionDependencySeed {
  readonly origen: string;
  readonly destino: string;
  readonly nivelMinimoRequerido: number;
  /** Por qué se afirma esta dependencia. Para revisión con INNLAB. */
  readonly razon: string;
}

export const DIMENSION_DEPENDENCIES: readonly DimensionDependencySeed[] = [
  {
    origen: 'TmRL',
    destino: 'TRL',
    nivelMinimoRequerido: 3,
    razon:
      'Sin un equipo con competencias técnicas mínimas no hay quien sostenga el desarrollo del producto.',
  },
  {
    origen: 'TmRL',
    destino: 'CRL',
    nivelMinimoRequerido: 3,
    razon:
      'La validación con clientes exige dedicación sostenida de alguien del equipo; sin equipo no hay descubrimiento.',
  },
  {
    origen: 'TmRL',
    destino: 'BRL',
    nivelMinimoRequerido: 3,
    razon:
      'Diseñar y probar un modelo de negocio requiere criterio y tiempo del equipo fundador.',
  },
  {
    origen: 'TRL',
    destino: 'CRL',
    nivelMinimoRequerido: 3,
    razon:
      'No se puede validar la disposición a adoptar sin algo funcional que el cliente pueda usar.',
  },
  {
    origen: 'TRL',
    destino: 'IPRL',
    nivelMinimoRequerido: 4,
    razon:
      'Proteger propiedad intelectual exige que la solución técnica esté suficientemente definida para delimitar qué se protege.',
  },
  {
    origen: 'CRL',
    destino: 'BRL',
    nivelMinimoRequerido: 4,
    razon:
      'Un modelo de negocio sin segmento de cliente validado se construye sobre supuestos, no sobre evidencia.',
  },
  {
    origen: 'CRL',
    destino: 'FRL',
    nivelMinimoRequerido: 4,
    razon:
      'Ningún financiador evalúa favorablemente una iniciativa que no ha demostrado demanda.',
  },
  {
    origen: 'IPRL',
    destino: 'FRL',
    nivelMinimoRequerido: 4,
    razon:
      'La debida diligencia de inversión revisa la titularidad y la libertad de operación de los intangibles.',
  },
  {
    origen: 'BRL',
    destino: 'FRL',
    nivelMinimoRequerido: 3,
    razon:
      'Sin proyecciones ni estructura de ingresos no hay cómo sustentar una solicitud de capital.',
  },
];

// ─────────────────────────────────────────────────────────────────────────
// Guardas en tiempo de import
// ─────────────────────────────────────────────────────────────────────────
//
// Siguen el precedente de `statements.ts`, que lanza al importarse si no
// hay 48 afirmaciones. Convierten un error de configuración en un fallo
// de arranque del seed en vez de un 500 frente a un usuario meses después.

const CODIGOS_VALIDOS = new Set(DIMENSIONS.map((d) => d.codigo as string));

for (const arista of DIMENSION_DEPENDENCIES) {
  for (const [rol, codigo] of [
    ['origen', arista.origen],
    ['destino', arista.destino],
  ] as const) {
    if (!CODIGOS_VALIDOS.has(codigo)) {
      throw new Error(
        `Dependencia inválida: '${codigo}' (${rol}) no es una dimensión del marco. ` +
          `Válidas: ${[...CODIGOS_VALIDOS].join(', ')}. ` +
          `Ojo con la eme minúscula de 'TmRL'.`,
      );
    }
  }
  if (arista.origen === arista.destino) {
    throw new Error(
      `Dependencia reflexiva: '${arista.origen}' no puede depender de sí misma`,
    );
  }
  if (
    arista.nivelMinimoRequerido < 1 ||
    arista.nivelMinimoRequerido > 9 ||
    !Number.isInteger(arista.nivelMinimoRequerido)
  ) {
    throw new Error(
      `Nivel requerido fuera de [1,9] en ${arista.origen}→${arista.destino}: ` +
        `${arista.nivelMinimoRequerido}`,
    );
  }
}

const pares = DIMENSION_DEPENDENCIES.map((a) => `${a.origen}->${a.destino}`);
const duplicados = pares.filter((p, i) => pares.indexOf(p) !== i);
if (duplicados.length > 0) {
  throw new Error(
    `Dependencias duplicadas: ${[...new Set(duplicados)].join(', ')}`,
  );
}

/**
 * La guarda que más vale: el grafo declarado tiene que ser acíclico.
 *
 * Se resuelve con el mismo algoritmo de capas del motor (Kahn), pero
 * escrito aquí de forma independiente y a propósito: si el motor tuviera
 * un fallo en la detección de ciclos, una guarda que lo reutilizara
 * heredaría ese mismo fallo y no detectaría nada.
 */
const gradoEntrada = new Map<string, number>(
  [...CODIGOS_VALIDOS].map((c) => [c, 0]),
);
for (const a of DIMENSION_DEPENDENCIES) {
  gradoEntrada.set(a.destino, (gradoEntrada.get(a.destino) ?? 0) + 1);
}

const restantes = new Set(CODIGOS_VALIDOS);
let progreso = true;
while (restantes.size > 0 && progreso) {
  const sinEntrada = [...restantes].filter((d) => gradoEntrada.get(d) === 0);
  progreso = sinEntrada.length > 0;
  for (const d of sinEntrada) {
    restantes.delete(d);
    for (const a of DIMENSION_DEPENDENCIES) {
      if (a.origen === d && restantes.has(a.destino)) {
        gradoEntrada.set(a.destino, (gradoEntrada.get(a.destino) ?? 1) - 1);
      }
    }
  }
}

if (restantes.size > 0) {
  throw new Error(
    `El grafo de dependencias tiene un ciclo. Dimensiones implicadas: ` +
      `${[...restantes].sort().join(', ')}. ` +
      `Un ciclo hace imposible ordenar las fases del roadmap.`,
  );
}

if (DIMENSION_DEPENDENCIES.length !== 9) {
  throw new Error(
    `Se esperaban 9 dependencias declaradas; hay ${DIMENSION_DEPENDENCIES.length}`,
  );
}
