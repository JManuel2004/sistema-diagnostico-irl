import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { RecomendacionRepositoryPort } from '../../domain/ports/recomendacion.repository.port.js';
import {
  Recomendacion,
  type ResultadoTipo,
  type TrazaEvaluacion,
} from '../../domain/entities/recomendacion.aggregate.js';
import type { CandidatoPuntuado } from '../../domain/value-objects/candidato-puntuado.vo.js';
import { RecomendacionPortafolioOrm } from './recomendacion-portafolio.orm-entity.js';
import { AlternativaRecomendacionOrm } from './alternativa-recomendacion.orm-entity.js';
import { TrazaCapasOrm } from './traza-capas.orm-entity.js';

/**
 * Adaptador del agregado `Recomendacion`.
 *
 * `save` escribe tres tablas —recomendación, alternativas y traza— dentro
 * de **una sola transacción**. No es una precaución opcional: son tres
 * escrituras de un mismo hecho, y una recomendación sin traza es una caja
 * negra mientras que unas alternativas huérfanas son basura.
 *
 * Se sigue el único precedente correcto del repositorio,
 * `TypeOrmAnswerSheetRepository.save`, que envuelve en
 * `manager.transaction()`. Hay una prueba de integración que corta la
 * escritura a la mitad y verifica que no queda nada.
 *
 * Política de reescritura: borrar e insertar. Regenerar la recomendación
 * de un diagnóstico reemplaza la anterior por completo, incluida su
 * traza, en lugar de acumular versiones — `UNIQUE (id_diagnostico)` no
 * admite otra cosa.
 */
@Injectable()
export class TypeOrmRecomendacionRepository
  implements RecomendacionRepositoryPort
{
  constructor(
    @InjectRepository(RecomendacionPortafolioOrm)
    private readonly orm: Repository<RecomendacionPortafolioOrm>,
  ) {}

  async save(recomendacion: Recomendacion): Promise<void> {
    await this.orm.manager.transaction(async (manager) => {
      // El borrado en cascada se lleva alternativas y traza.
      await manager.delete(RecomendacionPortafolioOrm, {
        idDiagnostico: recomendacion.diagnosticId.value,
      });

      const principal = recomendacion.principal;
      const fila = manager.create(RecomendacionPortafolioOrm, {
        idDiagnostico: recomendacion.diagnosticId.value,
        idVersionConfiguracion: recomendacion.idVersionConfiguracion,
        resultadoTipo: recomendacion.resultadoTipo,
        idServicioPrincipal: principal?.idServicio ?? null,
        puntajePrincipal: principal?.total ?? null,
        servicioSnapshot: principal?.nombreServicio ?? null,
        justificacionCriterio:
          recomendacion.justificacion ?? recomendacion.motivoSinRecomendacion,
        fechaGeneracion: recomendacion.generadaEn,
      });
      const guardada = await manager.save(RecomendacionPortafolioOrm, fila);

      if (recomendacion.alternativas.length > 0) {
        await manager.insert(
          AlternativaRecomendacionOrm,
          recomendacion.alternativas.map((alt, i) => ({
            idRecomendacion: guardada.idRecomendacion,
            idServicio: alt.idServicio,
            servicioSnapshot: alt.nombreServicio,
            // La principal ocupa la posición 1; las alternativas empiezan
            // en la 2, que es lo que exige `ck_alternativa_posicion`.
            posicion: i + 2,
            puntaje: alt.total,
          })),
        );
      }

      const t = recomendacion.traza;
      await manager.insert(TrazaCapasOrm, {
        idRecomendacion: guardada.idRecomendacion,
        excluidosCapa1: t.excluidosCapa1,
        rankingPreExcepcion: t.rankingPreExcepcion,
        excepcionesActivadas: t.excepcionesActivadas,
        excepcionesDescartadas: t.excepcionesDescartadas,
        rankingPostExcepcion: t.rankingPostExcepcion,
        idVersionConfiguracion: recomendacion.idVersionConfiguracion,
        idSnapshotCalibracion: recomendacion.idSnapshotCalibracion,
        idSnapshotParametros: recomendacion.idSnapshotParametros,
        hashHechos: t.hashHechos,
        evaluadoEn: recomendacion.generadaEn,
      });
    });
  }

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<Recomendacion | null> {
    const fila = await this.orm.findOne({ where: { idDiagnostico: diagnosticId } });
    if (!fila) return null;

    const manager = this.orm.manager;
    const [alternativas, traza] = await Promise.all([
      manager.find(AlternativaRecomendacionOrm, {
        where: { idRecomendacion: fila.idRecomendacion },
        order: { posicion: 'ASC' },
      }),
      manager.findOne(TrazaCapasOrm, {
        where: { idRecomendacion: fila.idRecomendacion },
      }),
    ]);

    if (!traza) {
      // No debería ocurrir: la traza se escribe en la misma transacción.
      // Si falta, la fila es de una escritura no atómica y no se puede
      // explicar — mejor tratarla como inexistente que devolver media.
      return null;
    }

    const trazaDominio: TrazaEvaluacion = {
      excluidosCapa1: traza.excluidosCapa1 as TrazaEvaluacion['excluidosCapa1'],
      rankingPreExcepcion:
        traza.rankingPreExcepcion as readonly CandidatoPuntuado[],
      excepcionesActivadas:
        traza.excepcionesActivadas as TrazaEvaluacion['excepcionesActivadas'],
      excepcionesDescartadas:
        traza.excepcionesDescartadas as TrazaEvaluacion['excepcionesDescartadas'],
      rankingPostExcepcion:
        traza.rankingPostExcepcion as readonly CandidatoPuntuado[],
      caracterizacionIncompleta: [],
      hashHechos: traza.hashHechos,
    };

    const rankingPost = trazaDominio.rankingPostExcepcion;
    const principal =
      fila.idServicioPrincipal === null
        ? null
        : (rankingPost.find((c) => c.idServicio === fila.idServicioPrincipal) ??
          null);

    return Recomendacion.fromPersistence({
      diagnosticId: fila.idDiagnostico,
      idVersionConfiguracion: fila.idVersionConfiguracion,
      idSnapshotCalibracion: traza.idSnapshotCalibracion,
      idSnapshotParametros: traza.idSnapshotParametros,
      resultadoTipo: fila.resultadoTipo as ResultadoTipo,
      principal,
      alternativas: alternativas
        .map((a) =>
          rankingPost.find((c) => c.idServicio === a.idServicio),
        )
        .filter((c): c is CandidatoPuntuado => c !== undefined),
      justificacion:
        fila.resultadoTipo === 'RECOMENDACION'
          ? fila.justificacionCriterio
          : null,
      motivoSinRecomendacion:
        fila.resultadoTipo === 'SIN_RECOMENDACION'
          ? fila.justificacionCriterio
          : null,
      traza: trazaDominio,
      generadaEn: fila.fechaGeneracion,
    });
  }
}
