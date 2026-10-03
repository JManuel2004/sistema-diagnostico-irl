import { ApiProperty } from '@nestjs/swagger';
import type {
  LayerTraceResponse,
  RecommendationResponse,
  RecommendedService,
  ServiceBand,
  ServiceTier,
} from '@innlab/contracts';

class ServiceTierDto implements ServiceTier {
  @ApiProperty({ example: 'descubre' }) code!: string;
  @ApiProperty({ example: 'Descubre' }) name!: string;
  @ApiProperty({ minimum: 1, description: '1 is the lightest tier' })
  order!: number;
  @ApiProperty({ type: String, nullable: true, example: 'Conócenos jugando' })
  tagline!: string | null;
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'Formatos cortos y de baja inversión para encender la relación…',
  })
  description!: string | null;
}

class ServiceBandDto implements ServiceBand {
  @ApiProperty({ minimum: 1, maximum: 9 }) minLevel!: number;
  @ApiProperty({ minimum: 1, maximum: 9 }) maxLevel!: number;
}

class RecommendedServiceDto implements RecommendedService {
  @ApiProperty() idService!: number;
  @ApiProperty({ example: 'Reto Express' }) name!: string;
  @ApiProperty({
    example: 'Hackatón · Design Sprint · Challenge',
    description: 'The formats the service covers',
  })
  subtitle!: string;
  @ApiProperty({
    type: String,
    nullable: true,
    description: 'What the service is about, read from the portfolio catalog',
  })
  description!: string | null;
  @ApiProperty({
    description:
      'What the service can achieve, read from the portfolio catalog',
  })
  scope!: string;
  @ApiProperty({
    type: ServiceBandDto,
    nullable: true,
    description:
      'Global IRL level band the service suits; null when the portfolio gives none',
  })
  band!: ServiceBandDto | null;
  @ApiProperty({ type: ServiceTierDto }) tier!: ServiceTierDto;
  @ApiProperty({ minimum: 1 }) position!: number;
  @ApiProperty({
    type: Number,
    nullable: true,
    description: 'Null for a service an adjustment put into the ranking',
  })
  score!: number | null;
  @ApiProperty({
    type: String,
    nullable: true,
    description:
      'Reason of the adjustment that put the service into the ranking, if one did',
  })
  adjustmentReason!: string | null;
}

/** OpenAPI shape of `RecommendationResponse` — the initiative leader's view. */
export class RecommendationResponseDto implements RecommendationResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ enum: ['RECOMMENDATION', 'NO_RECOMMENDATION'] })
  resultType!: 'RECOMMENDATION' | 'NO_RECOMMENDATION';
  @ApiProperty({ type: RecommendedServiceDto, nullable: true })
  primary!: RecommendedServiceDto | null;
  @ApiProperty({ type: String, nullable: true }) justification!: string | null;
  @ApiProperty({ type: String, nullable: true }) noRecommendationReason!:
    | string
    | null;
  @ApiProperty({ type: [RecommendedServiceDto] })
  alternatives!: RecommendedServiceDto[];

  @ApiProperty({ format: 'date-time' }) generatedAt!: string;
}

const OBJECT_LIST = {
  type: 'array',
  items: { type: 'object', additionalProperties: true },
} as const;

/**
 * OpenAPI shape of `LayerTraceResponse` — the INNLAB team's view. The nested
 * rankings and exceptions are documented as objects; their exact shape is
 * the contract's `layerTraceResponseSchema`.
 */
export class LayerTraceResponseDto implements LayerTraceResponse {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({
    ...OBJECT_LIST,
    description: 'Layer 1: services excluded and why',
  })
  layer1Excluded!: LayerTraceResponse['layer1Excluded'];
  @ApiProperty({
    ...OBJECT_LIST,
    description: 'Layer 2: ranking of the pure calculation',
  })
  rankingBeforeExceptions!: LayerTraceResponse['rankingBeforeExceptions'];
  @ApiProperty({
    ...OBJECT_LIST,
    description:
      'Layer 3: exceptions applied, with the ranking before and after each',
  })
  appliedExceptions!: LayerTraceResponse['appliedExceptions'];
  @ApiProperty({
    ...OBJECT_LIST,
    description: 'Layer 3: exceptions evaluated but discarded, and why',
  })
  discardedExceptions!: LayerTraceResponse['discardedExceptions'];
  @ApiProperty({ ...OBJECT_LIST, description: 'Final ranking' })
  rankingAfterExceptions!: LayerTraceResponse['rankingAfterExceptions'];

  @ApiProperty({
    description:
      'The recommended service is not the one that won the calculation',
  })
  adjustedByException!: boolean;
  @ApiProperty({
    type: [String],
    description: 'Characterization fields that were missing',
  })
  incompleteCharacterization!: LayerTraceResponse['incompleteCharacterization'];
  @ApiProperty({ description: 'SHA-256 of the input facts' })
  factsHash!: string;
  @ApiProperty({ format: 'date-time' }) evaluatedAt!: string;
}
