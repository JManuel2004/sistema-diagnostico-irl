import {
  DIMENSION_CODES,
  type DimensionCode,
  type MaturityProfileResponse,
  type RoadmapResponse,
} from '@innlab/contracts';

interface Edge {
  readonly origen: DimensionCode;
  readonly destino: DimensionCode;
  readonly nivelMinimoRequerido: number;
}

/** Grafo sembrado en el API (RF-14). Mínimo esperado hipotético: 4. */
const MINIMO_ESPERADO: Readonly<Record<DimensionCode, number>> = {
  TRL: 4,
  CRL: 4,
  BRL: 4,
  IPRL: 4,
  TmRL: 4,
  FRL: 4,
};

const ARISTAS: readonly Edge[] = [
  { origen: 'TmRL', destino: 'TRL', nivelMinimoRequerido: 3 },
  { origen: 'TmRL', destino: 'CRL', nivelMinimoRequerido: 3 },
  { origen: 'TmRL', destino: 'BRL', nivelMinimoRequerido: 3 },
  { origen: 'TRL', destino: 'CRL', nivelMinimoRequerido: 3 },
  { origen: 'TRL', destino: 'IPRL', nivelMinimoRequerido: 4 },
  { origen: 'CRL', destino: 'BRL', nivelMinimoRequerido: 4 },
  { origen: 'CRL', destino: 'FRL', nivelMinimoRequerido: 4 },
  { origen: 'IPRL', destino: 'FRL', nivelMinimoRequerido: 4 },
  { origen: 'BRL', destino: 'FRL', nivelMinimoRequerido: 3 },
];

/**
 * Replica el motor de roadmap del backend cuando Render todavía no
 * expone `GET /diagnosticos/:id/roadmap`.
 */
export function buildOfflineRoadmap(
  profile: MaturityProfileResponse,
): RoadmapResponse {
  const niveles = new Map<DimensionCode, number>(
    profile.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
  );

  const incoming = (destino: DimensionCode): readonly Edge[] =>
    ARISTAS.filter((e) => e.destino === destino);
  const outgoing = (origen: DimensionCode): readonly Edge[] =>
    ARISTAS.filter((e) => e.origen === origen);

  const cerradura = new Set<DimensionCode>();
  const porRevisar: DimensionCode[] = [];
  for (const d of DIMENSION_CODES) {
    const nivel = niveles.get(d);
    if (nivel !== undefined && nivel < MINIMO_ESPERADO[d]) {
      cerradura.add(d);
      porRevisar.push(d);
    }
  }
  while (porRevisar.length > 0) {
    const destino = porRevisar.shift()!;
    for (const arista of incoming(destino)) {
      const nivelOrigen = niveles.get(arista.origen);
      if (nivelOrigen === undefined) continue;
      if (nivelOrigen < arista.nivelMinimoRequerido && !cerradura.has(arista.origen)) {
        cerradura.add(arista.origen);
        porRevisar.push(arista.origen);
      }
    }
  }

  const internas = ARISTAS.filter(
    (e) => cerradura.has(e.origen) && cerradura.has(e.destino),
  );
  const gradoEntrada = new Map<DimensionCode, number>(
    [...cerradura].map((d) => [d, 0]),
  );
  for (const e of internas) {
    gradoEntrada.set(e.destino, (gradoEntrada.get(e.destino) ?? 0) + 1);
  }

  const restantes = new Set(cerradura);
  const capas: DimensionCode[][] = [];
  while (restantes.size > 0) {
    const capa = [...restantes].filter((d) => gradoEntrada.get(d) === 0);
    if (capa.length === 0) {
      throw new Error('El grafo de dependencias entre dimensiones está mal configurado.');
    }
    capa.sort((a, b) => DIMENSION_CODES.indexOf(a) - DIMENSION_CODES.indexOf(b));
    capas.push(capa);
    for (const d of capa) restantes.delete(d);
    for (const e of internas) {
      if (capa.includes(e.origen) && restantes.has(e.destino)) {
        gradoEntrada.set(e.destino, (gradoEntrada.get(e.destino) ?? 1) - 1);
      }
    }
  }

  const phases = capas.map((capa, indice) => ({
    order: indice + 1,
    dimensions: capa.map((code) => {
      const exigencias = outgoing(code)
        .filter((e) => cerradura.has(e.destino))
        .map((e) => e.nivelMinimoRequerido);
      const exigenciaSucesores = exigencias.length > 0 ? Math.max(...exigencias) : 0;
      return {
        dimensionCode: code,
        currentLevel: niveles.get(code) ?? 1,
        targetLevel: Math.max(MINIMO_ESPERADO[code], exigenciaSucesores),
        enables: outgoing(code)
          .filter((e) => cerradura.has(e.destino))
          .map((e) => e.destino),
      };
    }),
  }));

  return {
    diagnosticId: profile.diagnosticId,
    generatedAt: new Date().toISOString(),
    phases,
    dimensionsWithoutIntervention: DIMENSION_CODES.filter((d) => !cerradura.has(d)),
  };
}
