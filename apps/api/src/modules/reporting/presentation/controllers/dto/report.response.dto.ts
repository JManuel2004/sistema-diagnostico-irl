import { ApiProperty } from '@nestjs/swagger';
import {
  DIMENSION_CODES,
  type DiagnosticReport,
  type DimensionAnswers,
  type DimensionCode,
  type GivenAnswer,
  type ReportAttribution,
} from '@innlab/contracts';
import { InitiativeResponseDto } from '../../../../initiative/presentation/controllers/dto/initiative.response.dto.js';
import { MaturityProfileResponseDto } from '../../../../diagnosis/presentation/controllers/dto/diagnosis.response.dto.js';
import { RecommendationResponseDto } from '../../../../routing/presentation/controllers/dto/recommendation.response.dto.js';
import { RoadmapResponseDto } from '../../../../roadmap/presentation/controllers/dto/roadmap.response.dto.js';

class GivenAnswerDto implements GivenAnswer {
  @ApiProperty({ example: '12' }) statementId!: string;
  @ApiProperty({ minimum: 1, maximum: 8 }) sequence!: number;
  @ApiProperty() text!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) value!: number;
  @ApiProperty({ type: String, nullable: true }) justification!: string | null;
}

class DimensionAnswersDto implements DimensionAnswers {
  @ApiProperty({ enum: DIMENSION_CODES }) dimensionCode!: DimensionCode;
  @ApiProperty() name!: string;
  @ApiProperty({ type: [GivenAnswerDto] }) answers!: GivenAnswerDto[];
}

class ReportAttributionDto implements ReportAttribution {
  @ApiProperty({ example: 'KTH Innovation Readiness Level (IRL)' })
  framework!: string;
  @ApiProperty({ example: 'KTH Innovation' }) owner!: string;
  @ApiProperty({ example: 'CC BY-NC-SA 4.0' }) license!: string;
  @ApiProperty({
    example: 'https://creativecommons.org/licenses/by-nc-sa/4.0/',
  })
  licenseUrl!: string;
  @ApiProperty({
    example: 'Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0.',
  })
  notice!: string;
}

/**
 * OpenAPI shape of `DiagnosticReport`; the contract (`@innlab/contracts`) is
 * the source. Each section reuses the response DTO of the endpoint that
 * serves it on its own, so Swagger documents a single shape per result.
 */
export class DiagnosticReportResponseDto implements DiagnosticReport {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ example: 'KTH-IRL-1.0' }) frameworkVersion!: string;
  @ApiProperty({
    format: 'date-time',
    description: 'When the deep analysis was completed',
  })
  completedAt!: string;
  @ApiProperty({ type: InitiativeResponseDto })
  initiative!: InitiativeResponseDto;
  @ApiProperty({
    type: [DimensionAnswersDto],
    description: 'What the user answered to each statement, by dimension',
  })
  answers!: DimensionAnswersDto[];
  @ApiProperty({ type: MaturityProfileResponseDto })
  profile!: MaturityProfileResponseDto;
  @ApiProperty({ type: RecommendationResponseDto })
  recommendation!: RecommendationResponseDto;
  @ApiProperty({ type: RoadmapResponseDto }) roadmap!: RoadmapResponseDto;
  @ApiProperty({ type: ReportAttributionDto })
  attribution!: ReportAttributionDto;
}
