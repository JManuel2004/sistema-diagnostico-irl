import type {
  RecomendacionResponse,
  TrazaCapasResponse,
} from '@innlab/contracts';
import type { Recomendacion } from '../domain/entities/recomendacion.aggregate.js';
import type { CandidatoPuntuado } from '../domain/value-objects/candidato-puntuado.vo.js';

/**
 * Mapea el agregado a la respuesta pública.
 *
 * La respuesta al líder de iniciativa NO incluye la traza. Son dos
 * audiencias distintas: quien recibe la recomendación necesita saber qué
 * se le sugiere y por qué en lenguaje llano; quien la audita necesita el
 * desglose por capas. Mezclarlas convertiría la pantalla de resultado en
 * un volcado de cálculo.
 */
export function toRecomendacionResponse(
  recomendacion: Recomendacion,
  numeroVersion: number,
): RecomendacionResponse {
  return {
    diagnosticId: recomendacion.diagnosticId.value,
    resultadoTipo: recomendacion.resultadoTipo,
    principal: recomendacion.principal
      ? aServicioRecomendado(recomendacion.principal, 1)
      : null,
    justificacion: recomendacion.justificacion,
    motivoSinRecomendacion: recomendacion.motivoSinRecomendacion,
    alternativas: recomendacion.alternativas.map((c, i) =>
      aServicioRecomendado(c, i + 2),
    ),
    versionConfiguracion: numeroVersion,
    generadaEn: recomendacion.generadaEn.toISOString(),
  };
}

/**
 * Mapea la traza. Audiencia: el equipo de INNLAB.
 *
 * `ajustadoPorExcepcion` se deriva del agregado y no se recalcula aquí:
 * es la afirmación de que el servicio recomendado no es el que ganó el
 * cálculo, y tiene que salir de un solo sitio.
 */
export function toTrazaCapasResponse(
  recomendacion: Recomendacion,
  numeros: {
    version: number;
    calibracion: number;
    parametros: number;
  },
): TrazaCapasResponse {
  const t = recomendacion.traza;
  return {
    diagnosticId: recomendacion.diagnosticId.value,
    excluidosCapa1: t.excluidosCapa1.map((e) => ({
      idServicio: e.idServicio,
      nombre: e.nombre,
      mensajeExclusion: e.mensajeExclusion,
    })),
    rankingPreExcepcion: t.rankingPreExcepcion.map(aEntradaRanking),
    excepcionesActivadas: t.excepcionesActivadas.map((e) => ({
      codigo: e.codigo,
      orden: e.orden,
      accion: e.accion,
      servicioObjetivo: e.servicioObjetivo,
      motivoDeclarado: e.motivoDeclarado,
      rankingAntes: e.rankingAntes.map(aEntradaRanking),
      rankingDespues: e.rankingDespues.map(aEntradaRanking),
      efecto: e.efecto,
    })),
    excepcionesDescartadas: t.excepcionesDescartadas.map((e) => ({
      codigo: e.codigo,
      orden: e.orden,
      razon: e.razon,
    })),
    rankingPostExcepcion: t.rankingPostExcepcion.map(aEntradaRanking),
    ajustadoPorExcepcion: recomendacion.ajustadoPorExcepcion(),
    caracterizacionIncompleta: [...t.caracterizacionIncompleta],
    versionConfiguracion: numeros.version,
    snapshotCalibracion: numeros.calibracion,
    snapshotParametros: numeros.parametros,
    hashHechos: t.hashHechos,
    evaluadoEn: recomendacion.generadaEn.toISOString(),
  };
}

function aServicioRecomendado(c: CandidatoPuntuado, posicion: number) {
  return {
    idServicio: c.idServicio,
    nombre: c.nombreServicio,
    posicion,
    puntaje: c.total,
  };
}

function aEntradaRanking(c: CandidatoPuntuado, i: number) {
  return {
    posicion: i + 1,
    idServicio: c.idServicio,
    nombre: c.nombreServicio,
    puntaje: c.total,
    aportes: {
      cuelloBotella: {
        valor: c.aportes.cuelloBotella.valor,
        detalle: c.aportes.cuelloBotella.detalle.map((d) => ({ ...d })),
      },
      brechas: {
        valor: c.aportes.brechas.valor,
        detalle: c.aportes.brechas.detalle.map((d) => ({ ...d })),
      },
      desequilibrios: {
        valor: c.aportes.desequilibrios.valor,
        detalle: c.aportes.desequilibrios.detalle.map((d) => ({ ...d })),
      },
      afinidadEtapa: { ...c.aportes.afinidadEtapa },
      penalizacionRango: { ...c.aportes.penalizacionRango },
    },
  };
}
