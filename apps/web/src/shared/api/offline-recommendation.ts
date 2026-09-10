import {
  type DimensionCode,
  type MaturityProfileResponse,
  type RecomendacionResponse,
  type TrazaCapasResponse,
} from '@innlab/contracts';

interface Servicio {
  readonly idServicio: number;
  readonly nombre: string;
  readonly foco: readonly DimensionCode[];
}

const SERVICIOS: readonly Servicio[] = [
  { idServicio: 1, nombre: 'Formación', foco: ['TmRL'] },
  { idServicio: 2, nombre: 'Mentoría', foco: ['CRL', 'FRL'] },
  { idServicio: 3, nombre: 'Consultoría', foco: ['BRL', 'IPRL'] },
  { idServicio: 4, nombre: 'Retos en el Aula', foco: ['CRL', 'TRL'] },
  { idServicio: 5, nombre: 'Proyectos Integradores', foco: ['TRL'] },
  { idServicio: 6, nombre: 'Proyectos de Grado', foco: ['TRL', 'IPRL'] },
];

function puntuar(servicio: Servicio, profile: MaturityProfileResponse): number {
  const cuellos = new Set(profile.bottleneck.dimensions);
  const brechas = new Set(profile.gaps.dimensions);
  let total = 0;
  for (const dim of servicio.foco) {
    if (cuellos.has(dim)) total += 3;
    else if (brechas.has(dim)) total += 1.5;
  }
  return total;
}

/**
 * Recomendación local cuando Render no tiene el motor de enrutamiento.
 * Usa el perfil ya calculado y el portafolio SA-02.
 */
export function buildOfflineRecommendation(
  profile: MaturityProfileResponse,
): RecomendacionResponse {
  const ranking = SERVICIOS.map((s) => ({
    idServicio: s.idServicio,
    nombre: s.nombre,
    puntaje: puntuar(s, profile),
  })).sort((a, b) => b.puntaje - a.puntaje || a.idServicio - b.idServicio);

  const principal = ranking[0];
  const foco = profile.bottleneck.dimensions.join(', ');
  const justificacion = principal
    ? `${principal.nombre} atiende de forma directa la dimensión más rezagada del perfil: ${foco}.`
    : null;

  return {
    diagnosticId: profile.diagnosticId,
    resultadoTipo: principal && principal.puntaje > 0 ? 'RECOMENDACION' : 'SIN_RECOMENDACION',
    principal:
      principal && principal.puntaje > 0
        ? { ...principal, posicion: 1 }
        : null,
    justificacion: principal && principal.puntaje > 0 ? justificacion : null,
    motivoSinRecomendacion:
      principal && principal.puntaje > 0
        ? null
        : 'Ningún servicio del portafolio cubre el cuello de botella del perfil.',
    alternativas: ranking.slice(1, 3).map((s, i) => ({
      ...s,
      posicion: i + 2,
    })),
    versionConfiguracion: 1,
    generadaEn: new Date().toISOString(),
  };
}

export function buildOfflineRecommendationTrace(
  profile: MaturityProfileResponse,
): TrazaCapasResponse {
  const rec = buildOfflineRecommendation(profile);
  const ranking = (rec.principal ? [rec.principal, ...rec.alternativas] : rec.alternativas).map(
    (s) => ({
      posicion: s.posicion,
      idServicio: s.idServicio,
      nombre: s.nombre,
      puntaje: s.puntaje,
    }),
  );

  return {
    diagnosticId: profile.diagnosticId,
    excluidosCapa1: [],
    rankingPreExcepcion: ranking,
    excepcionesActivadas: [],
    excepcionesDescartadas: [],
    rankingPostExcepcion: ranking,
    ajustadoPorExcepcion: false,
    caracterizacionIncompleta: ['etapa', 'sector', 'tamanoEquipo', 'vinculacionAcademica'],
    versionConfiguracion: 1,
    snapshotCalibracion: 1,
    snapshotParametros: 1,
    hashHechos: profile.diagnosticId,
    evaluadoEn: new Date().toISOString(),
  };
}
