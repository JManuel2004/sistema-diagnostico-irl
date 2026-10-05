import { ApiProperty } from '@nestjs/swagger';
import {
  DIMENSION_CODES,
  ROADMAP_INCLUSION_REASONS,
  ROADMAP_TARGET_REASONS,
  type DimensionCode,
  type DimensionRef,
  type PhaseService,
  type PhaseServiceTrace,
  type RoadmapDimensionTarget,
  type RoadmapInclusionReason,
  type RoadmapPhase,
  type RoadmapResponse,
  type RoadmapTargetReason,
  type ServiceBand,
  type ServiceTier,
} from '@innlab/contracts';

class DimensionRefDto implements DimensionRef {
  @ApiProperty({ enum: DIMENSION_CODES }) code!: DimensionCode;
  @ApiProperty({ example: 'Financiamiento' }) name!: string;
  @ApiProperty({ example: 'Financiación' }) shortName!: string;
}

class RoadmapDimensionTargetDto implements RoadmapDimensionTarget {
  @ApiProperty({ enum: DIMENSION_CODES }) dimensionCode!: DimensionCode;
  @ApiProperty() name!: string;
  @ApiProperty() shortName!: string;
  @ApiProperty({
    minimum: 1,
    maximum: 9,
    description: 'Level when the phase starts',
  })
  currentLevel!: number;
  @ApiProperty({
    minimum: 1,
    maximum: 9,
    description: 'Level by the end of this phase',
  })
  targetLevel!: number;
  @ApiProperty({
    minimum: 1,
    maximum: 9,
    description: 'Level at the end of the route',
  })
  finalTargetLevel!: number;
  @ApiProperty({
    type: [DimensionRefDto],
    description: 'What this dimension unlocks',
  })
  enables!: DimensionRefDto[];
  @ApiProperty({ enum: ROADMAP_INCLUSION_REASONS })
  inclusionReason!: RoadmapInclusionReason;
  @ApiProperty({ minimum: 1, maximum: 9 }) expectedMinimum!: number;
  @ApiProperty({
    enum: ROADMAP_TARGET_REASONS,
    description: 'What sets the final target',
  })
  targetReason!: RoadmapTargetReason;
  @ApiProperty({
    type: DimensionRefDto,
    nullable: true,
    description: 'Who sets the final target',
  })
  targetDrivenBy!: DimensionRefDto | null;
}

class ServiceTierDto implements ServiceTier {
  @ApiProperty({ example: 'co-crea' }) code!: string;
  @ApiProperty({ example: 'Co-crea' }) name!: string;
  @ApiProperty({ minimum: 1, description: '1 is the lightest tier' })
  order!: number;
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Tu reto entra al aula',
  })
  tagline!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Tu organización lleva retos reales a cursos y semilleros…',
  })
  description!: string | null;
}

class ServiceBandDto implements ServiceBand {
  @ApiProperty({ minimum: 1, maximum: 9 }) minLevel!: number;
  @ApiProperty({ minimum: 1, maximum: 9 }) maxLevel!: number;
}

class PhaseServiceDto implements PhaseService {
  @ApiProperty() idService!: number;
  @ApiProperty({ example: 'Reto en el Aula' }) name!: string;
  @ApiProperty() subtitle!: string;
  @ApiProperty({ type: String, nullable: true }) description!: string | null;
  @ApiProperty({ description: 'What the service can achieve' }) scope!: string;
  @ApiProperty({ type: ServiceBandDto, nullable: true })
  band!: ServiceBandDto | null;
  @ApiProperty({ type: ServiceTierDto }) tier!: ServiceTierDto;
  @ApiProperty({
    description:
      'True when no service reached the phase minimum and this is the best available',
  })
  approximate!: boolean;
}

class RoadmapPhaseDto implements RoadmapPhase {
  @ApiProperty({ minimum: 1 }) order!: number;
  @ApiProperty({
    type: [RoadmapDimensionTargetDto],
    description: 'Worked on in parallel',
  })
  dimensions!: RoadmapDimensionTargetDto[];
  @ApiProperty({
    type: PhaseServiceDto,
    nullable: true,
    description: 'Service that could be contracted for the phase',
  })
  service!: PhaseServiceDto | null;
  @ApiProperty({
    type: 'object',
    additionalProperties: true,
    description:
      "How the service was chosen; its exact shape is the contract's `phaseServiceTraceSchema`",
  })
  serviceTrace!: PhaseServiceTrace;
}

/** OpenAPI shape of `RoadmapResponse`. */
export class RoadmapResponseDto implements RoadmapResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ type: [RoadmapPhaseDto] }) phases!: RoadmapPhaseDto[];
  @ApiProperty({
    type: 'object',
    additionalProperties: { type: 'integer', minimum: 1, maximum: 9 },
    description: 'The profile projected to the end of the route',
  })
  finalLevels!: RoadmapResponse['finalLevels'];
  @ApiProperty({
    description: 'True when no pair ends with an imbalance with an alert',
  })
  balanced!: boolean;
  @ApiProperty({ type: [DimensionRefDto] })
  dimensionsWithoutIntervention!: DimensionRefDto[];
}
