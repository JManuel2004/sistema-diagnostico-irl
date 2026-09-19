import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exceptionActionSchema, type DimensionCode } from '@innlab/contracts';
import type {
  ActiveConfigurationRepositoryPort,
  ResolvedConfiguration,
} from '../../../domain/repositories/active-configuration.repository.port.js';
import { CalibrationScale } from '../../../domain/value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../../../domain/value-objects/ordinal-profile.vo.js';
import type { CompiledEligibilityRule } from '../../../domain/services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../../../domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../../domain/services/predicate-compiler.service.js';
import { CalibrationLabelValueOrm } from '../orm-entities/calibration-label-value.orm-entity.js';
import { ScoringParametersOrm } from '../orm-entities/scoring-parameters.orm-entity.js';
import { PublishedOrdinalProfileOrm } from '../orm-entities/published-ordinal-profile.orm-entity.js';
import { PublishedOrdinalIntensityOrm } from '../orm-entities/published-ordinal-intensity.orm-entity.js';
import { PublishedEligibilityRuleOrm } from '../orm-entities/published-eligibility-rule.orm-entity.js';
import { PublishedExceptionRuleOrm } from '../orm-entities/published-exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from '../orm-entities/portfolio-service.orm-entity.js';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';

/**
 * Adaptador de lectura de la configuración de enrutamiento.
 *
 * Sin versionado: el esquema de versionado de configuración se retiró
 * (backlog 5.6) — hay una sola configuración vigente en `scoring_parameters`
 * (tabla singleton), `calibration_label_value` y los tres `published_*`,
 * ninguno ya scoped a una versión.
 *
 * Los predicados se recompilan al leer, no se confía en que el `jsonb`
 * almacenado sea válido. En teoría bastaría con compilarlos al sembrar la
 * configuración; en la práctica, una restauración de base de datos o una
 * edición manual pueden dejar un predicate corrupto, y prefiero que eso
 * falle al cargar la configuración antes que a mitad de una evaluación.
 *
 * Lee las dimensiones a través de `TaxonomyRepositoryPort` en vez de su
 * entidad ORM directamente — `shared/irl-taxonomy/` es un contexto propio,
 * no una tabla que cualquier módulo pueda alcanzar por su cuenta.
 */
@Injectable()
export class TypeOrmActiveConfigurationRepository
  implements ActiveConfigurationRepositoryPort
{
  private readonly compiler = new PredicateCompilerService();

  constructor(
    @InjectRepository(CalibrationLabelValueOrm)
    private readonly labels: Repository<CalibrationLabelValueOrm>,
    @InjectRepository(ScoringParametersOrm)
    private readonly parameters: Repository<ScoringParametersOrm>,
    @InjectRepository(PublishedOrdinalProfileOrm)
    private readonly profiles: Repository<PublishedOrdinalProfileOrm>,
    @InjectRepository(PublishedOrdinalIntensityOrm)
    private readonly intensities: Repository<PublishedOrdinalIntensityOrm>,
    @InjectRepository(PublishedEligibilityRuleOrm)
    private readonly eligibility: Repository<PublishedEligibilityRuleOrm>,
    @InjectRepository(PublishedExceptionRuleOrm)
    private readonly exceptions: Repository<PublishedExceptionRuleOrm>,
    @InjectRepository(PortfolioServiceOrm)
    private readonly services: Repository<PortfolioServiceOrm>,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
  ) {}

  async load(): Promise<ResolvedConfiguration | null> {
    const [params] = await this.parameters.find({ take: 1 });
    if (!params) return null;

    const [
      tiers,
      profileRows,
      elegRows,
      excRows,
      serviceRows,
      dimensions,
    ] = await Promise.all([
      this.labels.find({ order: { monotonicityOrder: 'ASC' } }),
      this.profiles.find(),
      this.eligibility.find(),
      this.exceptions.find({ order: { priorityOrder: 'ASC' } }),
      this.services.find(),
      this.taxonomy.findAllDimensions(),
    ]);

    const nameByService = new Map(
      serviceRows.map((s) => [s.idService, s.name] as const),
    );
    const codeByDimension = new Map(
      dimensions.map((d) => [d.id, d.code.value] as const),
    );

    const intensityRows = await this.intensities.find({
      where: profileRows.map((f) => ({ idOrdinalProfile: f.idOrdinalProfile })),
    });
    const intensitiesByProfile = new Map<string, PublishedOrdinalIntensityOrm[]>();
    for (const row of intensityRows) {
      const list = intensitiesByProfile.get(row.idOrdinalProfile) ?? [];
      list.push(row);
      intensitiesByProfile.set(row.idOrdinalProfile, list);
    }

    const profiles: OrdinalProfile[] = profileRows.map((f) => {
      const intensities = new Map<DimensionCode, string>();
      for (const i of intensitiesByProfile.get(f.idOrdinalProfile) ?? []) {
        const code = codeByDimension.get(i.idDimension);
        if (code) intensities.set(code, i.label);
      }
      return {
        idService: f.idService,
        serviceName: nameByService.get(f.idService) ?? String(f.idService),
        minLevel: f.minLevel,
        maxLevel: f.maxLevel,
        // Lista separada por comas; `filter` descarta el caso de cadena vacía.
        relevantStages: f.relevantStages
          .split(',')
          .map((e) => e.trim())
          .filter((e) => e.length > 0),
        intensities,
      };
    });

    const eligibilityRules: CompiledEligibilityRule[] = elegRows.map((r) => ({
      idRegla: r.id,
      idService: r.idService,
      expresion: this.compiler.compile(r.predicate, 'BOOLEAN'),
      exclusionMessage: r.exclusionMessage,
    }));

    const exceptionRules: CompiledExceptionRule[] = excRows.map((r) => ({
      code: r.code,
      priorityOrder: r.priorityOrder,
      expresion: this.compiler.compile(r.predicate, 'WITH_DEGREE'),
      // Validated at runtime on top of the DB CHECK, instead of trusting a cast.
      action: exceptionActionSchema.parse(r.action),
      idTargetService: r.idTargetService,
      positions: r.positions,
      declaredReason: r.declaredReason,
    }));

    return {
      scale: CalibrationScale.create(
        tiers.map((p) => ({
          label: p.label,
          value: p.numericValue,
          order: p.monotonicityOrder,
        })),
      ),
      parameters: {
        bottleneckWeight: params.bottleneckWeight,
        gapWeight: params.gapWeight,
        moderateImbalanceWeight: params.moderateImbalanceWeight,
        criticalImbalanceWeight: params.criticalImbalanceWeight,
        stageAffinityWeight: params.stageAffinityWeight,
        outOfRangePenalty: params.outOfRangePenalty,
        minimumThreshold: params.minimumThreshold,
        alternativesCount: params.alternativesCount,
      },
      profiles,
      eligibilityRules,
      exceptionRules,
    };
  }
}
