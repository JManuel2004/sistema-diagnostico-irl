import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type {
  ActiveConfigurationRepositoryPort,
  ResolvedConfiguration,
} from '../../domain/ports/active-configuration.repository.port.js';
import { CalibrationScale } from '../../domain/value-objects/calibration-scale.vo.js';
import type { OrdinalProfile } from '../../domain/value-objects/ordinal-profile.vo.js';
import type { CompiledEligibilityRule } from '../../domain/services/eligibility-filter.service.js';
import type {
  ExceptionAction,
  CompiledExceptionRule,
} from '../../domain/services/exception-engine.service.js';
import { PredicateCompilerService } from '../../domain/services/predicate-compiler.service.js';
import { ConfigurationVersionOrm } from './configuration-version.orm-entity.js';
import { CalibrationSnapshotOrm } from './calibration-snapshot.orm-entity.js';
import { CalibrationLabelValueOrm } from './calibration-label-value.orm-entity.js';
import { ParametersSnapshotOrm } from './parameters-snapshot.orm-entity.js';
import { PublishedOrdinalProfileOrm } from './published-ordinal-profile.orm-entity.js';
import { PublishedOrdinalIntensityOrm } from './published-ordinal-intensity.orm-entity.js';
import { PublishedEligibilityRuleOrm } from './published-eligibility-rule.orm-entity.js';
import { PublishedExceptionRuleOrm } from './published-exception-rule.orm-entity.js';
import { PortfolioServiceOrm } from './portfolio-service.orm-entity.js';
import { DimensionOrm } from '../../../../shared/irl-taxonomy/infrastructure/database/orm-entities/dimension.orm-entity.js';

/**
 * Adaptador de lectura de la configuración publicada.
 *
 * Los predicados se recompilan al leer, no se confía en que el `jsonb`
 * almacenado sea válido. Una versión publicada es inmutable, así que en
 * teoría bastaría con compilarla al publicar; en la práctica, una
 * restauración de base de datos o una edición manual pueden dejar un
 * predicate corrupto, y prefiero que eso falle al cargar la
 * configuración antes que a mitad de una evaluación.
 */
@Injectable()
export class TypeOrmActiveConfigurationRepository
  implements ActiveConfigurationRepositoryPort
{
  private readonly compiler = new PredicateCompilerService();

  constructor(
    @InjectRepository(ConfigurationVersionOrm)
    private readonly versions: Repository<ConfigurationVersionOrm>,
    @InjectRepository(CalibrationSnapshotOrm)
    private readonly calibrations: Repository<CalibrationSnapshotOrm>,
    @InjectRepository(CalibrationLabelValueOrm)
    private readonly labels: Repository<CalibrationLabelValueOrm>,
    @InjectRepository(ParametersSnapshotOrm)
    private readonly parameters: Repository<ParametersSnapshotOrm>,
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
    @InjectRepository(DimensionOrm)
    private readonly dimensions: Repository<DimensionOrm>,
  ) {}

  async loadActive(): Promise<ResolvedConfiguration | null> {
    const version = await this.versions.findOne({
      where: { state: 'ACTIVE' },
    });
    return version ? this.resolve(version) : null;
  }

  async loadByVersion(number: number): Promise<ResolvedConfiguration | null> {
    const version = await this.versions.findOne({ where: { number } });
    return version ? this.resolve(version) : null;
  }

  private async resolve(
    version: ConfigurationVersionOrm,
  ): Promise<ResolvedConfiguration> {
    const [
      calibration,
      tiers,
      params,
      profileRows,
      elegRows,
      excRows,
      serviceRows,
      dimRows,
    ] = await Promise.all([
      this.calibrations.findOneByOrFail({
        idCalibrationSnapshot: version.idCalibrationSnapshot,
      }),
      this.labels.find({
        where: { idCalibrationSnapshot: version.idCalibrationSnapshot },
        order: { monotonicityOrder: 'ASC' },
      }),
      this.parameters.findOneByOrFail({
        idParametersSnapshot: version.idParametersSnapshot,
      }),
      this.profiles.find({
        where: { idConfigurationVersion: version.idConfigurationVersion },
      }),
      this.eligibility.find({
        where: { idConfigurationVersion: version.idConfigurationVersion },
      }),
      this.exceptions.find({
        where: { idConfigurationVersion: version.idConfigurationVersion },
        order: { priorityOrder: 'ASC' },
      }),
      this.services.find(),
      this.dimensions.find(),
    ]);

    const nameByService = new Map(
      serviceRows.map((s) => [s.idService, s.name] as const),
    );
    const codeByDimension = new Map(
      dimRows.map((d) => [d.idDimension, d.code as DimensionCode] as const),
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
      action: r.action as ExceptionAction,
      idTargetService: r.idTargetService,
      positions: r.positions,
      declaredReason: r.declaredReason,
    }));

    return {
      idConfigurationVersion: version.idConfigurationVersion,
      versionNumber: version.number,
      idCalibrationSnapshot: calibration.idCalibrationSnapshot,
      calibrationSnapshotNumber: calibration.number,
      idParametersSnapshot: params.idParametersSnapshot,
      parametersSnapshotNumber: params.number,
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
