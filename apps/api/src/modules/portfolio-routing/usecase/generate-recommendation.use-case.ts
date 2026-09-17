import { Inject, Injectable } from '@nestjs/common';
import { createHash } from 'node:crypto';
import type {
  DimensionCode,
  DiagnosticFacts,
  RecommendationResponse,
} from '@innlab/contracts';
import {
  ACTIVE_CONFIGURATION_REPOSITORY,
  type ActiveConfigurationRepositoryPort,
} from '../domain/ports/active-configuration.repository.port.js';
import {
  RECOMMENDATION_REPOSITORY,
  type RecommendationRepositoryPort,
} from '../domain/ports/recommendation.repository.port.js';
import {
  INITIATIVE_CHARACTERIZATION_READER,
  type InitiativeCharacterizationPort,
} from '../domain/ports/initiative-characterization.port.js';
import { OrdinalTranslatorService } from '../domain/services/ordinal-translator.service.js';
import { EligibilityFilterService } from '../domain/services/eligibility-filter.service.js';
import { AffinityScorerService } from '../domain/services/affinity-scorer.service.js';
import { ExceptionEngineService } from '../domain/services/exception-engine.service.js';
import { Recommendation } from '../domain/entities/recommendation.aggregate.js';
import {
  NoActiveConfigurationError,
  ProfileNotComputedError,
} from '../domain/errors/portfolio-routing.errors.js';
import { GetMaturityProfileUseCase } from '../../maturity-profile/usecase/get-maturity-profile.use-case.js';
import { Uuid } from '../../../shared-kernel/domain/value-objects/uuid.vo.js';
import { toRecomendacionResponse } from './map-recommendation-response.js';

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
    private readonly configuration: ActiveConfigurationRepositoryPort,
    @Inject(RECOMMENDATION_REPOSITORY)
    private readonly recommendations: RecommendationRepositoryPort,
    @Inject(INITIATIVE_CHARACTERIZATION_READER)
    private readonly caracterizaciones: InitiativeCharacterizationPort,
    private readonly perfiles: GetMaturityProfileUseCase,
    private readonly traductor: OrdinalTranslatorService,
    private readonly eligibility: EligibilityFilterService,
    private readonly scorer: AffinityScorerService,
    private readonly exceptions: ExceptionEngineService,
  ) {}

  async execute(
    cmd: GenerateRecommendationCommand,
  ): Promise<RecommendationResponse> {
    const diagnosticId = Uuid.create(cmd.diagnosticId);

    const config = await this.configuration.loadActive();
    if (!config) {
      throw new NoActiveConfigurationError({ diagnosticId: diagnosticId.value });
    }

    const facts = await this.construirHechos(diagnosticId.value);

    // ── Capa 0: traducir el vocabulario ordinal a números ──────────────
    const fichasNumericas = this.traductor.translate(config.profiles, config.scale);

    // ── Capa 1: filtro duro ────────────────────────────────────────────
    const { eligible, excluded } = this.eligibility.filter(
      fichasNumericas,
      config.eligibilityRules,
      facts,
    );

    // ── Capa 2: cálculo de afinidad ────────────────────────────────────
    const puntuados = this.scorer.score(eligible, facts, config.parameters);
    const rankingPre = [...puntuados].sort(ordenarCandidatos);

    // ── Capa 3: ajustes puntuales ──────────────────────────────────────
    const { rankingPost, applied, discarded } = this.exceptions.apply(
      rankingPre,
      config.exceptionRules,
      facts,
    );

    const recommendation = Recommendation.create({
      diagnosticId,
      idConfigurationVersion: config.idConfigurationVersion,
      idCalibrationSnapshot: config.idCalibrationSnapshot,
      idParametersSnapshot: config.idParametersSnapshot,
      finalRanking: rankingPost,
      minimumThreshold: config.parameters.minimumThreshold,
      alternativesCount: config.parameters.alternativesCount,
      justification: construirJustificacion(rankingPost, applied),
      noRecommendationReason: null,
      trace: {
        layer1Excluded: excluded,
        rankingBeforeExceptions: rankingPre,
        appliedExceptions: applied,
        discardedExceptions: discarded,
        rankingAfterExceptions: rankingPost,
        incompleteCharacterization: camposAusentes(facts),
        factsHash: hashDe(facts),
      },
      generatedAt: new Date(),
    });

    await this.recommendations.save(recommendation);

    return toRecomendacionResponse(recommendation, config.versionNumber);
  }

  /**
   * Arma los hechos del diagnóstico.
   *
   * El cuello de botella y las brechas se toman del perfil calculado, no
   * de las columnas `is_bottleneck` / `in_critical_state` de
   * `dimension_result`: la primera se persiste siempre en `false` y la
   * segunda guarda una semántica distinta de la del SRS. Derivarlas del
   * agregado evita depender de columnas cuyo significado está en disputa.
   */
  private async construirHechos(
    diagnosticId: string,
  ): Promise<DiagnosticFacts> {
    const perfil = await this.perfiles
      .execute({ diagnosticId })
      .catch(() => null);

    if (!perfil) {
      throw new ProfileNotComputedError(diagnosticId);
    }

    const characterization =
      await this.caracterizaciones.findByDiagnosticId(diagnosticId);

    const levelByDimension = Object.fromEntries(
      perfil.dimensionResults.map((r) => [r.dimensionCode, r.irlLevel]),
    ) as Record<DimensionCode, number>;

    const niveles = perfil.dimensionResults.map((r) => r.irlLevel);
    const averageLevel = niveles.reduce((a, b) => a + b, 0) / niveles.length;

    return {
      diagnosticId,
      levelByDimension,
      bottlenecks: perfil.bottleneck.dimensions,
      gaps: perfil.gaps.dimensions,
      // El contrato HTTP expone las clasificaciones en inglés minúsculas;
      // el dominio del motor trabaja con las del marco, en español.
      imbalances: (perfil.imbalances ?? []).map((i) => ({
        left: i.left,
        right: i.right,
        difference: i.difference,
        classification:
          i.classification === 'critical'
            ? ('CRITICO' as const)
            : i.classification === 'moderate'
              ? ('MODERADO' as const)
              : ('ACEPTABLE' as const),
      })),
      averageLevel,
      characterization,
    };
  }
}

/**
 * Orden del ranking: score descendente y, ante empate exacto, por
 * `idService` ascendente.
 *
 * El desempate por id no es "justo" en ningún sentido de negocio, pero es
 * determinista y reproducible, que es lo que exige la traza. Un empate en
 * el primer puesto es además una señal de que la calibración no
 * discrimina, y el validador inter-capas del ciclo de configuración es el
 * lugar donde eso debe hacerse visible.
 */
function ordenarCandidatos(
  a: { total: number; idService: number },
  b: { total: number; idService: number },
): number {
  if (b.total !== a.total) return b.total - a.total;
  return a.idService - b.idService;
}

function camposAusentes(facts: DiagnosticFacts): string[] {
  const c = facts.characterization;
  const ausentes: string[] = [];
  if (c.stage === null) ausentes.push('stage');
  if (c.sector === null) ausentes.push('sector');
  if (c.teamSize === null) ausentes.push('teamSize');
  if (c.academicLinkage === null) ausentes.push('academicLinkage');
  return ausentes;
}

/**
 * Huella de los hechos de entrada. Permite comprobar, al reproducir una
 * recomendación antigua, que se está evaluando el mismo perfil y no uno
 * que cambió por debajo.
 */
function hashDe(facts: DiagnosticFacts): string {
  return createHash('sha256').update(JSON.stringify(facts)).digest('hex');
}

/**
 * Justificación en el vocabulario del marco, no en números.
 *
 * Cuando un ajuste puntual decide el primer puesto, se dice
 * explícitamente y se cita su reason declarado: una recomendación que
 * proviene de una decisión del centro y no del cálculo tiene que
 * presentarse como tal.
 */
function construirJustificacion(
  ranking: readonly { serviceName: string; contributions: { bottleneck: { details: readonly { dimension: string; sourceLabel: string }[] } } }[],
  applied: readonly { targetService: string; declaredReason: string }[],
): string | null {
  const ganador = ranking[0];
  if (!ganador) return null;

  const decisiva = applied.find(
    (e) => e.targetService === ganador.serviceName,
  );
  if (decisiva) {
    return `${ganador.serviceName} — ${decisiva.declaredReason}`;
  }

  const foco = ganador.contributions.bottleneck.details
    .filter((d) => d.sourceLabel !== 'not_applicable')
    .map((d) => `${d.dimension} (${d.sourceLabel})`)
    .join(', ');

  return foco.length > 0
    ? `${ganador.serviceName} atiende de forma directa la dimensión más rezagada del perfil: ${foco}.`
    : `${ganador.serviceName} es el servicio con mayor afinidad global con el perfil de la iniciativa.`;
}
