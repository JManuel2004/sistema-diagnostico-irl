import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  DimensionCode,
  HechosDiagnostico,
  RecomendacionResponse,
} from '@innlab/contracts';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import {
  RECOMENDACION_REPOSITORY,
  type RecomendacionRepositoryPort,
} from '../domain/ports/recomendacion.repository.port.js';
import {
  INITIATIVE_CHARACTERIZATION_READER,
  type InitiativeCharacterizationPort,
} from '../domain/ports/initiative-characterization.port.js';
import { OrdinalTranslatorService } from '../domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from '../domain/services/exception-engine.service.js';
import { Recomendacion } from '../domain/entities/recomendacion.aggregate.js';
import {
  NoActiveConfigurationError,
  ProfileNotComputedError,
} from '../domain/errors/portfolio-routing.errors.js';
import { GetMaturityProfileUseCase } from '../../maturity-profile/application/get-maturity-profile.use-case.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { toRecomendacionResponse } from './map-recomendacion-response.js';

export interface GenerateRecommendationCommand {
  diagnosticId: string;
}

/**
 * Orquesta las tres capas del motor y persiste el resultado.
 *
 * El caso de uso resuelve la IO —perfil, caracterización, configuración
 * vigente— y luego encadena cuatro servicios de dominio puros. Ninguno de
 * ellos toca la base de datos, que es lo que permite que el simulador del
 * ciclo de configuración ejecute exactamente el mismo motor que
 * producción sin montar media aplicación.
 */
@Injectable()
export class GenerateRecommendationUseCase {
  constructor(
    @Inject(ACTIVE_CONFIGURATION_REPOSITORY)
    private readonly configuracion: ActiveConfigurationRepositoryPort,
    @Inject(RECOMENDACION_REPOSITORY)
    private readonly recomendaciones: RecomendacionRepositoryPort,
    @Inject(INITIATIVE_CHARACTERIZATION_READER)
    private readonly caracterizaciones: InitiativeCharacterizationPort,
    private readonly perfiles: GetMaturityProfileUseCase,
    private readonly traductor: OrdinalTranslatorService,
    private readonly elegibilidad: EligibilityFilterService,
    private readonly scorer: AffinityScorerService,
    private readonly excepciones: ExceptionEngineService,
  ) {}

  async execute(
    cmd: GenerateRecommendationCommand,
  ): Promise<RecomendacionResponse> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    const config = await this.configuracion.loadActive();
    if (!config) {
      throw new NoActiveConfigurationError({ diagnosticId: diagnosticId.value });
    }

    const hechos = await this.construirHechos(diagnosticId.value);

    // ── Capa 0: traducir el vocabulario ordinal a números ──────────────
    const fichasNumericas = this.traductor.translate(config.fichas, config.escala);

    // ── Capa 1: filtro duro ────────────────────────────────────────────
    const { elegibles, excluidos } = this.elegibilidad.filter(
      fichasNumericas,
      config.reglasElegibilidad,
      hechos,
    );

    // ── Capa 2: cálculo de afinidad ────────────────────────────────────
    const puntuados = this.scorer.score(elegibles, hechos, config.parametros);
    const rankingPre = [...puntuados].sort(ordenarCandidatos);

    // ── Capa 3: ajustes puntuales ──────────────────────────────────────
    const { rankingPost, activadas, descartadas } = this.excepciones.apply(
      rankingPre,
      config.reglasExcepcion,
      hechos,
    );

    const recomendacion = Recomendacion.create({
      diagnosticId,
      idVersionConfiguracion: config.idVersionConfiguracion,
      idSnapshotCalibracion: config.idSnapshotCalibracion,
      idSnapshotParametros: config.idSnapshotParametros,
      rankingFinal: rankingPost,
      umbralMinimo: config.parametros.umbralMinimo,
      nAlternativas: config.parametros.nAlternativas,
      justificacion: construirJustificacion(rankingPost, activadas),
      motivoSinRecomendacion: null,
      traza: {
        excluidosCapa1: excluidos,
        rankingPreExcepcion: rankingPre,
        excepcionesActivadas: activadas,
        excepcionesDescartadas: descartadas,
        rankingPostExcepcion: rankingPost,
        caracterizacionIncompleta: camposAusentes(hechos),
        hashHechos: hashDe(hechos),
      },
      generadaEn: new Date(),
    });

    await this.recomendaciones.save(recomendacion);

    return toRecomendacionResponse(recomendacion, config.numeroVersion);
  }

  /**
   * Arma los hechos del diagnóstico.
   *
   * El cuello de botella y las brechas se toman del perfil calculado, no
   * de las columnas `es_cuello_botella` / `en_estado_critico` de
   * `resultado_dimension`: la primera se persiste siempre en `false` y la
   * segunda guarda una semántica distinta de la del SRS. Derivarlas del
   * agregado evita depender de columnas cuyo significado está en disputa.
   */
  private async construirHechos(
    diagnosticId: string,
  ): Promise<HechosDiagnostico> {
    const perfil = await this.perfiles
      .execute({ diagnosticId })
      .catch(() => null);

    if (!perfil) {
      throw new ProfileNotComputedError(diagnosticId);
    }

    const caracterizacion =
      await this.caracterizaciones.findByDiagnosticId(diagnosticId);

    const nivelPorDimension = Object.fromEntries(
      perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    ) as Record<DimensionCode, number>;

    const niveles = perfil.dimensionResults.map((r) => r.irlLevel);
    const nivelPromedio = niveles.reduce((a, b) => a + b, 0) / niveles.length;

    return {
      diagnosticId,
      nivelPorDimension,
      cuellosBotella: perfil.bottleneck.dimensions,
      brechas: perfil.gaps.dimensions,
      // El contrato HTTP expone las clasificaciones en inglés minúsculas;
      // el dominio del motor trabaja con las del marco, en español.
      desequilibrios: (perfil.imbalances ?? []).map((i) => ({
        izquierda: i.left,
        derecha: i.right,
        diferencia: i.difference,
        clasificacion:
          i.classification === 'critical'
            ? ('CRITICO' as const)
            : i.classification === 'moderate'
              ? ('MODERADO' as const)
              : ('ACEPTABLE' as const),
      })),
      nivelPromedio,
      caracterizacion,
    };
  }
}

/**
 * Orden del ranking: puntaje descendente y, ante empate exacto, por
 * `idServicio` ascendente.
 *
 * El desempate por id no es "justo" en ningún sentido de negocio, pero es
 * determinista y reproducible, que es lo que exige la traza. Un empate en
 * el primer puesto es además una señal de que la calibración no
 * discrimina, y el validador inter-capas del ciclo de configuración es el
 * lugar donde eso debe hacerse visible.
 */
function ordenarCandidatos(
  a: { total: number; idServicio: number },
  b: { total: number; idServicio: number },
): number {
  if (b.total !== a.total) return b.total - a.total;
  return a.idServicio - b.idServicio;
}

function camposAusentes(hechos: HechosDiagnostico): string[] {
  const c = hechos.caracterizacion;
  const ausentes: string[] = [];
  if (c.etapa === null) ausentes.push('etapa');
  if (c.sector === null) ausentes.push('sector');
  if (c.tamanoEquipo === null) ausentes.push('tamanoEquipo');
  if (c.vinculacionAcademica === null) ausentes.push('vinculacionAcademica');
  return ausentes;
}

/**
 * Huella de los hechos de entrada. Permite comprobar, al reproducir una
 * recomendación antigua, que se está evaluando el mismo perfil y no uno
 * que cambió por debajo.
 */
function hashDe(hechos: HechosDiagnostico): string {
  return createHash('sha256').update(JSON.stringify(hechos)).digest('hex');
}

/**
 * Justificación en el vocabulario del marco, no en números.
 *
 * Cuando un ajuste puntual decide el primer puesto, se dice
 * explícitamente y se cita su motivo declarado: una recomendación que
 * proviene de una decisión del centro y no del cálculo tiene que
 * presentarse como tal.
 */
function construirJustificacion(
  ranking: readonly { nombreServicio: string; aportes: { cuelloBotella: { detalle: readonly { dimension: string; etiquetaOrigen: string }[] } } }[],
  activadas: readonly { servicioObjetivo: string; motivoDeclarado: string }[],
): string | null {
  const ganador = ranking[0];
  if (!ganador) return null;

  const decisiva = activadas.find(
    (e) => e.servicioObjetivo === ganador.nombreServicio,
  );
  if (decisiva) {
    return `${ganador.nombreServicio} — ${decisiva.motivoDeclarado}`;
  }

  const foco = ganador.aportes.cuelloBotella.detalle
    .filter((d) => d.etiquetaOrigen !== 'no_aplica')
    .map((d) => `${d.dimension} (${d.etiquetaOrigen})`)
    .join(', ');

  return foco.length > 0
    ? `${ganador.nombreServicio} atiende de forma directa la dimensión más rezagada del perfil: ${foco}.`
    : `${ganador.nombreServicio} es el servicio con mayor afinidad global con el perfil de la iniciativa.`;
}
