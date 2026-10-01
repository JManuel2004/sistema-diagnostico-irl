import { Inject, Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { exceptionActionSchema, type DimensionCode } from '@innlab/contracts';
import type {
  RoutingConfigurationRepositoryPort,
  ResolvedConfiguration,
} from '../../../domain/repositories/routing-configuration.repository.port.js';
import { CalibrationScale } from '../../../domain/value-objects/calibration-scale.vo.js';
import type { AdjustmentOnlyService } from '../../../domain/value-objects/adjustment-only-service.vo.js';
import type { OrdinalProfile } from '../../../domain/value-objects/ordinal-profile.vo.js';
import type { CompiledEligibilityRule } from '../../../domain/services/eligibility-filter.service.js';
import type { CompiledExceptionRule } from '../../../domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../../domain/services/predicate-compiler.service.js';
import { CalibrationLabelValueOrm } from '../orm-entities/calibration-label-value.orm-entity.js';
import { ScoringParametersOrm } from '../orm-entities/scoring-parameters.orm-entity.js';
import { PortfolioServiceStageOrm } from '../orm-entities/portfolio-service-stage.orm-entity.js';
import { OrdinalIntensityOrm } from '../orm-entities/ordinal-intensity.orm-entity.js';
import { EligibilityRuleOrm } from '../orm-entities/eligibility-rule.orm-entity.js';
import { ExceptionRuleOrm } from '../orm-entities/exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from '../orm-entities/portfolio-service.orm-entity.js';
import {
  TAXONOMY_REPOSITORY,
  type TaxonomyRepositoryPort,
} from '../../../../../shared/irl-taxonomy/domain/repositories/taxonomy.repository.port.js';
import {
  INITIATIVE_CHARACTERIZATION_READER,
  type InitiativeCharacterizationPort,
} from '../../../domain/repositories/initiative-characterization.port.js';

/**
 * Read adapter of the routing configuration.
 *
 * The configuration is not versioned: there is one, made of the scoring
 * parameters (single row), the calibration scale, the services with their
 * ordinal profiles (level band, stages, one intensity label per dimension)
 * and the eligibility and exception rules. The services come out in two
 * lists: the scored ones, with their profile, and the adjustment-only ones,
 * which only an `INCLUDE` adjustment uses.
 *
 * The stages a service fits are stored by id; their codes come from
 * `initiative/` through `InitiativeCharacterizationPort`, never from its
 * tables.
 *
 * Predicates are recompiled on read; the stored `jsonb` is not trusted to
 * be valid. In theory compiling them when seeding would be enough; in
 * practice a database restore or a manual edit can leave a corrupt
 * predicate, and it is better for that to fail when loading the
 * configuration than halfway through an evaluation.
 *
 * Reads the dimensions through `TaxonomyRepositoryPort` instead of their
 * ORM entity — `shared/irl-taxonomy/` is a context of its own, not a table
 * any module can reach into.
 */
@Injectable()
export class TypeOrmRoutingConfigurationRepository implements RoutingConfigurationRepositoryPort {
  private readonly compiler = new PredicateCompilerService();

  constructor(
    @InjectRepository(CalibrationLabelValueOrm)
    private readonly labels: Repository<CalibrationLabelValueOrm>,
    @InjectRepository(ScoringParametersOrm)
    private readonly parameters: Repository<ScoringParametersOrm>,
    @InjectRepository(PortfolioServiceStageOrm)
    private readonly serviceStages: Repository<PortfolioServiceStageOrm>,
    @InjectRepository(OrdinalIntensityOrm)
    private readonly intensities: Repository<OrdinalIntensityOrm>,
    @InjectRepository(EligibilityRuleOrm)
    private readonly eligibility: Repository<EligibilityRuleOrm>,
    @InjectRepository(ExceptionRuleOrm)
    private readonly exceptions: Repository<ExceptionRuleOrm>,
    @InjectRepository(PortfolioServiceOrm)
    private readonly services: Repository<PortfolioServiceOrm>,
    @Inject(TAXONOMY_REPOSITORY)
    private readonly taxonomy: TaxonomyRepositoryPort,
    @Inject(INITIATIVE_CHARACTERIZATION_READER)
    private readonly initiative: InitiativeCharacterizationPort,
  ) {}

  async findServiceDescriptions(): Promise<ReadonlyMap<number, string | null>> {
    const rows = await this.services.find({
      select: { idService: true, description: true },
    });
    return new Map(rows.map((r) => [r.idService, r.description] as const));
  }

  async load(): Promise<ResolvedConfiguration | null> {
    const [params] = await this.parameters.find({ take: 1 });
    if (!params) return null;

    const [
      tiers,
      serviceRows,
      stageRows,
      intensityRows,
      eligibilityRows,
      exceptionRows,
      dimensions,
      stageCodes,
    ] = await Promise.all([
      this.labels.find({ order: { monotonicityOrder: 'ASC' } }),
      this.services.find({ order: { idService: 'ASC' } }),
      this.serviceStages.find(),
      this.intensities.find(),
      this.eligibility.find(),
      this.exceptions.find({ order: { priorityOrder: 'ASC' } }),
      this.taxonomy.findAllDimensions(),
      this.initiative.findStageCodes(),
    ]);

    const labelById = new Map(tiers.map((t) => [t.id, t.label] as const));
    const codeByDimension = new Map(
      dimensions.map((d) => [d.id, d.code.value] as const),
    );

    // Adjustment-only services are kept apart: layers 1 and 2 never see them.
    const scoredRows = serviceRows.filter((service) => !service.adjustmentOnly);
    const adjustmentOnlyServices: AdjustmentOnlyService[] = serviceRows
      .filter((service) => service.adjustmentOnly)
      .map((service) => ({
        idService: service.idService,
        serviceName: service.name,
      }));

    const profiles: OrdinalProfile[] = scoredRows.map((service) => {
      // The database requires the band of a scored service
      // (`ck_portfolio_service_scored_band`); this only narrows the type.
      if (service.minLevel === null || service.maxLevel === null) {
        throw new Error(
          `The scored service '${service.name}' has no level band`,
        );
      }
      const intensities = new Map<DimensionCode, string>();
      for (const i of intensityRows.filter(
        (r) => r.idService === service.idService,
      )) {
        const code = codeByDimension.get(i.idDimension);
        const label = labelById.get(i.idCalibrationLabel);
        if (code && label) intensities.set(code, label);
      }
      return {
        idService: service.idService,
        serviceName: service.name,
        minLevel: service.minLevel,
        maxLevel: service.maxLevel,
        relevantStages: stageRows
          .filter((r) => r.idService === service.idService)
          .map((r) => stageCodes.get(r.idStage))
          .filter((code): code is string => code !== undefined),
        intensities,
      };
    });

    const eligibilityRules: CompiledEligibilityRule[] = eligibilityRows.map(
      (r) => ({
        code: r.code,
        idService: r.idService,
        expression: this.compiler.compile(r.predicate, 'BOOLEAN'),
        exclusionMessage: r.exclusionMessage,
      }),
    );

    const exceptionRules: CompiledExceptionRule[] = exceptionRows.map((r) => ({
      code: r.code,
      priorityOrder: r.priorityOrder,
      expression: this.compiler.compile(r.predicate, 'WITH_DEGREE'),
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
      adjustmentOnlyServices,
      eligibilityRules,
      exceptionRules,
    };
  }
}
