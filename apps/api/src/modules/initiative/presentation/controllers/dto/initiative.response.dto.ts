import { ApiProperty } from '@nestjs/swagger';
import type {
  ConsentRecord,
  Initiative,
  InitiativeStage,
  Sector,
} from '@innlab/contracts';

export class SectorResponseDto implements Sector {
  @ApiProperty({ example: '1' }) id!: string;
  @ApiProperty({ example: 'Agroindustria / AgriTech' }) name!: string;
}

export class InitiativeStageResponseDto implements InitiativeStage {
  @ApiProperty({ example: '2' }) id!: string;
  @ApiProperty({ example: 'VALIDATION' }) code!: string;
  @ApiProperty({ example: 'Validación' }) name!: string;
}

export class ConsentRecordResponseDto implements ConsentRecord {
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty({ example: 'v1' }) version!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: string;
}

export class InitiativeResponseDto implements Initiative {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: SectorResponseDto }) sector!: SectorResponseDto;
  @ApiProperty() productType!: string;
  @ApiProperty({ type: InitiativeStageResponseDto })
  stage!: InitiativeStageResponseDto;
  @ApiProperty() declaredStage!: string;
  @ApiProperty({ minimum: 1 }) teamSize!: number;
  @ApiProperty() teamDescription!: string;
  @ApiProperty() targetMarket!: string;
  @ApiProperty() currentFunding!: string;
}
