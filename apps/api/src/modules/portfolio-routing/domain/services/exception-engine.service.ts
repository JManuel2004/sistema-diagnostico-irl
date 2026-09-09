import type { HechosDiagnostico } from '@innlab/contracts';
import type { CandidatoPuntuado } from '../value-objects/candidato-puntuado.vo.js';
import type { ArbolExpresion } from './predicate-compiler.service.js';
import { evaluarExpresion } from './predicate-compiler.service.js';

/**
 * Capa 3 — ajustes puntuales sobre el ranking calculado.
 *
 * Aquí es donde el centro interviene deliberadamente: forzar un servicio,
 * vetarlo, promoverlo o degradarlo unas posiciones cuando el cálculo, por
 * correcto que sea, no captura una consideración de criterio.
 *
 * Las excepciones se recorren en orden `prioridadOrden` ascendente. Ese
 * orden es único dentro de una versión por restricción de base de datos,
 * así que la cascada es total y determinista: no hay empates que resolver
 * ni dependencia del orden en que la base devuelva las filas.
 *
 * ── El riesgo que esta capa introduce ──────────────────────────────────
 *
 * Una excepción escrita para un patrón general puede desplazar a un
 * servicio que el cálculo había identificado bien, porque dos escenarios
 * distintos activan la misma condición. El sistema no puede resolver eso
 * automáticamente: es un problema de contenido, no de forma.
 *
 * Lo que sí hace, y por eso está construido así:
 *   - registra el ranking antes y después de **cada** excepción, no solo
 *     el resultado final, de modo que el efecto de una sea atribuible;
 *   - registra también las descartadas y por qué, para que "no pasó nada"
 *     sea una afirmación verificable y no una ausencia de información.
 */
export type AccionExcepcion = 'FORZAR' | 'VETAR' | 'PROMOVER' | 'DEGRADAR';

export interface ReglaExcepcionCompilada {
  readonly codigo: string;
  readonly prioridadOrden: number;
  readonly expresion: ArbolExpresion;
  readonly accion: AccionExcepcion;
  readonly idServicioObjetivo: number;
  readonly posiciones: number | null;
  readonly motivoDeclarado: string;
}

export interface ExcepcionAplicada {
  readonly codigo: string;
  readonly orden: number;
  readonly accion: AccionExcepcion;
  readonly servicioObjetivo: string;
  readonly motivoDeclarado: string;
  readonly rankingAntes: readonly CandidatoPuntuado[];
  readonly rankingDespues: readonly CandidatoPuntuado[];
  readonly efecto: string;
}

export interface ExcepcionDescartada {
  readonly codigo: string;
  readonly orden: number;
  readonly razon: string;
}

export interface ResultadoExcepciones {
  readonly rankingPost: readonly CandidatoPuntuado[];
  readonly activadas: readonly ExcepcionAplicada[];
  readonly descartadas: readonly ExcepcionDescartada[];
}

export class ExceptionEngineService {
  apply(
    rankingPre: readonly CandidatoPuntuado[],
    excepciones: readonly ReglaExcepcionCompilada[],
    hechos: HechosDiagnostico,
  ): ResultadoExcepciones {
    const activadas: ExcepcionAplicada[] = [];
    const descartadas: ExcepcionDescartada[] = [];
    let ranking: CandidatoPuntuado[] = [...rankingPre];

    const enOrden = [...excepciones].sort(
      (a, b) => a.prioridadOrden - b.prioridadOrden,
    );

    for (const regla of enOrden) {
      if (!evaluarExpresion(regla.expresion, hechos)) {
        descartadas.push({
          codigo: regla.codigo,
          orden: regla.prioridadOrden,
          razon: 'La condición no se cumple para este diagnóstico',
        });
        continue;
      }

      const indice = ranking.findIndex(
        (c) => c.idServicio === regla.idServicioObjetivo,
      );

      if (indice === -1) {
        // El objetivo no está en el ranking: quedó excluido en la capa 1 o
        // vetado por una excepción anterior. Se descarta con motivo
        // explícito en vez de fallar en silencio — es justo el conflicto
        // entre capas que el validador debe detectar al configurar.
        descartadas.push({
          codigo: regla.codigo,
          orden: regla.prioridadOrden,
          razon:
            'La condición se cumple, pero el servicio objetivo no está en el ranking ' +
            '(excluido por elegibilidad o vetado por una excepción anterior)',
        });
        continue;
      }

      const antes = [...ranking];
      const { siguiente, efecto } = this.aplicarAccion(ranking, indice, regla);
      ranking = siguiente;

      activadas.push({
        codigo: regla.codigo,
        orden: regla.prioridadOrden,
        accion: regla.accion,
        servicioObjetivo: antes[indice].nombreServicio,
        motivoDeclarado: regla.motivoDeclarado,
        rankingAntes: antes,
        rankingDespues: [...ranking],
        efecto,
      });
    }

    return { rankingPost: ranking, activadas, descartadas };
  }

  private aplicarAccion(
    ranking: readonly CandidatoPuntuado[],
    indice: number,
    regla: ReglaExcepcionCompilada,
  ): { siguiente: CandidatoPuntuado[]; efecto: string } {
    const lista = [...ranking];
    const [objetivo] = lista.splice(indice, 1);
    const nombre = objetivo.nombreServicio;

    switch (regla.accion) {
      case 'FORZAR': {
        lista.unshift(objetivo);
        return {
          siguiente: lista,
          efecto:
            indice === 0
              ? `${nombre} ya ocupaba el puesto 1; la excepción lo fija explícitamente`
              : `${nombre} pasa del puesto ${indice + 1} al puesto 1`,
        };
      }
      case 'VETAR': {
        return {
          siguiente: lista,
          efecto: `${nombre} se retira del ranking (estaba en el puesto ${indice + 1})`,
        };
      }
      case 'PROMOVER':
      case 'DEGRADAR': {
        const salto = regla.posiciones ?? 0;
        const delta = regla.accion === 'PROMOVER' ? -salto : salto;
        // Saturación en los extremos: promover 3 desde el puesto 2 deja
        // el puesto 1, no un índice negativo.
        const destino = Math.max(0, Math.min(lista.length, indice + delta));
        lista.splice(destino, 0, objetivo);
        const verbo = regla.accion === 'PROMOVER' ? 'sube' : 'baja';
        return {
          siguiente: lista,
          efecto:
            destino === indice
              ? `${nombre} se mantiene en el puesto ${indice + 1} (ya estaba en el extremo)`
              : `${nombre} ${verbo} del puesto ${indice + 1} al puesto ${destino + 1}`,
        };
      }
    }
  }
}
