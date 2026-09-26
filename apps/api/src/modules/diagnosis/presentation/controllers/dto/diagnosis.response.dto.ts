import { ApiProperty } from '@nestjs/swagger';
import {
  DIAGNOSTIC_STATES,
  DIMENSION_CODES,
  type AcceptDeepAnalysisResponse,
  type Asymmetry,
  type Bottleneck,
  type CriticalState,
  type Diagnostic,
  type DiagnosticState,
  type DimensionCode,
  type DimensionResult,
  type Gaps,
  type ImbalanceClassification,
  type ImbalancePairResult,
  type MaturityProfileResponse,
  type SubmitQuestionnaireResponse,
} from '@innlab/contracts';

const CLASSIFICATIONS = ['critical', 'moderate', 'acceptable'];

/** OpenAPI shape of `Diagnostic`; the contract (`@innlab/contracts`) is the source. */
export class DiagnosticResponseDto implements Diagnostic {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ description: 'Cognito `sub` of the owner' }) userId!: string;
  @ApiProperty({ enum: DIAGNOSTIC_STATES }) state!: DiagnosticState;
  @ApiProperty({
    description: 'The questionnaire was processed and the profile exists',
  })
  completed!: boolean;
  @ApiProperty({ description: 'The user accepted the deep analysis' })
  deepAnalysisAccepted!: boolean;
  @ApiProperty({ example: 'KTH-IRL-1.0', description: 'IRL framework version it is answered with' })
  frameworkVersion!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
}

export class AcceptDeepAnalysisResponseDto implements AcceptDeepAnalysisResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ enum: DIAGNOSTIC_STATES }) state!: DiagnosticState;
}

export class SubmitQuestionnaireResponseDto implements SubmitQuestionnaireResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ minimum: 0, maximum: 48 }) answersRecorded!: number;
  @ApiProperty({ enum: ['QUESTIONNAIRE_COMPLETE'] })
  state!: 'QUESTIONNAIRE_COMPLETE';
}

class DimensionResultDto implements DimensionResult {
  @ApiProperty({ enum: DIMENSION_CODES }) dimensionCode!: DimensionCode;
  @ApiProperty({ example: 'Madurez Tecnológica' }) name!: string;
  @ApiProperty({ example: 'Tecnología' }) shortName!: string;
  @ApiProperty({ minimum: 1, maximum: 5 }) averageLikert!: number;
  @ApiProperty({ minimum: 1, maximum: 9 }) irlLevel!: number;
}

class BottleneckDto implements Bottleneck {
  @ApiProperty({ enum: DIMENSION_CODES, isArray: true })
  dimensions!: DimensionCode[];
  @ApiProperty({ minimum: 1, maximum: 9 }) level!: number;
}

class AsymmetryDto implements Asymmetry {
  @ApiProperty({ minimum: 0, maximum: 8 }) difference!: number;
  @ApiProperty({ enum: CLASSIFICATIONS })
  classification!: ImbalanceClassification;
}

class GapsDto implements Gaps {
  @ApiProperty({ enum: DIMENSION_CODES, isArray: true })
  dimensions!: DimensionCode[];
  @ApiProperty({ minimum: 1, maximum: 9 }) threshold!: number;
}

class CriticalStateDto implements CriticalState {
  @ApiProperty({ enum: DIMENSION_CODES, isArray: true })
  dimensions!: DimensionCode[];
}

class ImbalancePairResultDto implements ImbalancePairResult {
  @ApiProperty({ enum: DIMENSION_CODES }) left!: DimensionCode;
  @ApiProperty({ enum: DIMENSION_CODES }) right!: DimensionCode;
  @ApiProperty({ minimum: 0, maximum: 8 }) difference!: number;
  @ApiProperty({ enum: CLASSIFICATIONS })
  classification!: ImbalanceClassification;
}

/** OpenAPI shape of `MaturityProfileResponse`. */
export class MaturityProfileResponseDto implements MaturityProfileResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ format: 'date-time' }) computedAt!: string;
  @ApiProperty({ type: [DimensionResultDto] })
  dimensionResults!: DimensionResultDto[];
  @ApiProperty({
    minimum: 1,
    maximum: 9,
    description: 'RF-09: simple average of the six levels',
  })
  globalAverage!: number;
  @ApiProperty({ type: BottleneckDto }) bottleneck!: BottleneckDto;
  @ApiProperty({
    type: BottleneckDto,
    description: 'Dimension(s) with the highest level',
  })
  strength!: BottleneckDto;
  @ApiProperty({ type: AsymmetryDto }) asymmetry!: AsymmetryDto;
  @ApiProperty({ type: GapsDto }) gaps!: GapsDto;
  @ApiProperty({ type: CriticalStateDto }) criticalState!: CriticalStateDto;
  @ApiProperty({ type: [ImbalancePairResultDto], required: false })
  imbalances?: ImbalancePairResultDto[];
}
