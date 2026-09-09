import type { HechosDiagnostico } from '@innlab/contracts';
import type { FichaNumerica } from '../value-objects/ficha-ordinal.vo.js';
import type { ArbolExpresion } from './predicate-compiler.service.js';
import { evaluarExpresion } from './predicate-compiler.service.js';

/**
 * Capa 1 — filtro duro.
 *
 * Una regla de elegibilidad expresa imposibilidad, no preferencia: si se
 * cumple, el servicio queda fuera y ya no compite. No resta puntos, no
 * baja posiciones. Esa distinción es la razón de que el compilador
 * rechace operadores de comparación numérica en modo `BOOLEANO`: en el
 * momento en que una exclusión admite grado, deja de ser un filtro y
 * pertenece a la capa 2.
 *
 * Un servicio sin ninguna regla asociada es elegible por defecto.
 *
 * Servicio puro, sin IO ni decoradores.
 */
export interface ReglaElegibilidadCompilada {
  readonly idRegla: string;
  readonly idServicio: number;
  readonly expresion: ArbolExpresion;
  readonly mensajeExclusion: string;
}

export interface ServicioExcluido {
  readonly idServicio: number;
  readonly nombre: string;
  readonly mensajeExclusion: string;
}

export interface ResultadoElegibilidad {
  readonly elegibles: readonly FichaNumerica[];
  readonly excluidos: readonly ServicioExcluido[];
}

export class EligibilityFilterService {
  filter(
    fichas: readonly FichaNumerica[],
    reglas: readonly ReglaElegibilidadCompilada[],
    hechos: HechosDiagnostico,
  ): ResultadoElegibilidad {
    const elegibles: FichaNumerica[] = [];
    const excluidos: ServicioExcluido[] = [];

    for (const ficha of fichas) {
      const aplicables = reglas.filter((r) => r.idServicio === ficha.idServicio);
      // La primera regla que se cumple excluye; el mensaje que se reporta
      // es el suyo, para que el motivo mostrado sea el que efectivamente
      // dejó fuera al servicio.
      const disparada = aplicables.find((r) =>
        evaluarExpresion(r.expresion, hechos),
      );

      if (disparada) {
        excluidos.push({
          idServicio: ficha.idServicio,
          nombre: ficha.nombreServicio,
          mensajeExclusion: disparada.mensajeExclusion,
        });
      } else {
        elegibles.push(ficha);
      }
    }

    return { elegibles, excluidos };
  }
}
