import { ApiProperty } from '@nestjs/swagger';
import {
  DIMENSION_CODES,
  ROADMAP_INCLUSION_REASONS,
  type DimensionCode,
  type DimensionRef,
  type RoadmapDimensionTarget,
  type RoadmapInclusionReason,
  type RoadmapPhase,
  type RoadmapResponse,
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
  @ApiProperty({ minimum: 1, maximum: 9 }) currentLevel!: number;
  @ApiProperty({ minimum: 1, maximum: 9 }) targetLevel!: number;
  @ApiProperty({
    type: [DimensionRefDto],
    description: 'What this dimension unlocks',
  })
  enables!: DimensionRefDto[];
  @ApiProperty({ enum: ROADMAP_INCLUSION_REASONS })
  inclusionReason!: RoadmapInclusionReason;
  @ApiProperty({ minimum: 1, maximum: 9 }) expectedMinimum!: number;
  @ApiProperty({
    type: DimensionRefDto,
    nullable: true,
    description: 'Who sets the target',
  })
  targetDrivenBy!: DimensionRefDto | null;
}

class RoadmapPhaseDto implements RoadmapPhase {
  @ApiProperty({ minimum: 1 }) order!: number;
  @ApiProperty({
    type: [RoadmapDimensionTargetDto],
    description: 'Worked on in parallel',
  })
  dimensions!: RoadmapDimensionTargetDto[];
}

/** OpenAPI shape of `RoadmapResponse`. */
export class RoadmapResponseDto implements RoadmapResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
  @ApiProperty({ type: [RoadmapPhaseDto] }) phases!: RoadmapPhaseDto[];
  @ApiProperty({ type: [DimensionRefDto] })
  dimensionsWithoutIntervention!: DimensionRefDto[];
}
