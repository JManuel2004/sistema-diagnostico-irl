import { ApiProperty } from '@nestjs/swagger';
import type {
  ConsentRecord,
  ConsentTerms,
  ConsentTermsSection,
  Initiative,
  InitiativeStage,
  InitiativeSummary,
  Sector,
  SectorOption,
} from '@innlab/contracts';

export class SectorResponseDto implements Sector {
  @ApiProperty({ example: '1' }) id!: string;
  @ApiProperty({
    example: 'A',
    nullable: true,
    type: String,
    description: 'Section code of the CIIU; null for «Otro»',
  })
  code!: string | null;
  @ApiProperty({
    example: 'Agricultura, ganadería, caza, silvicultura y pesca',
  })
  name!: string;
  @ApiProperty({ example: 'CIIU Rev. 5 A.C.' }) classification!: string;
  @ApiProperty({ description: 'Whether it is «Otro sector (especificar)»' })
  isOther!: boolean;
}

export class SectorOptionResponseDto
  extends SectorResponseDto
  implements SectorOption
{
  @ApiProperty({
    example:
      'Cultivos agrícolas, cría de animales, silvicultura y extracción de madera, pesca y acuicultura.',
    description:
      'What the section groups, in a line; for «Otro», when to choose it',
  })
  description!: string;
  @ApiProperty({ type: [String], example: ['agro', 'cultivos', 'agritech'] })
  keywords!: string[];
}

export class InitiativeStageResponseDto implements InitiativeStage {
  @ApiProperty({ example: '2' }) id!: string;
  @ApiProperty({ example: 'VALIDATION' }) code!: string;
  @ApiProperty({ example: 'Validación' }) name!: string;
}

export class ConsentRecordResponseDto implements ConsentRecord {
  @ApiProperty({ format: 'uuid' }) initiativeId!: string;
  @ApiProperty({ example: 'v1' }) version!: string;
  @ApiProperty({ format: 'date-time' }) acceptedAt!: string;
}

export class InitiativeResponseDto implements Initiative {
  @ApiProperty({ format: 'uuid', description: 'Id of the profile snapshot' })
  id!: string;
  @ApiProperty({ format: 'uuid' }) initiativeId!: string;
  @ApiProperty({ format: 'uuid' }) diagnosticId!: string;
  @ApiProperty() name!: string;
  @ApiProperty({ type: SectorResponseDto }) sector!: SectorResponseDto;
  @ApiProperty({
    nullable: true,
    type: String,
    description: 'The user’s own sector; only with the «Otro» sector',
  })
  customSector!: string | null;
  @ApiProperty() productType!: string;
  @ApiProperty({ type: InitiativeStageResponseDto })
  stage!: InitiativeStageResponseDto;
  @ApiProperty() declaredStage!: string;
  @ApiProperty({ minimum: 1 }) teamSize!: number;
  @ApiProperty() teamDescription!: string;
  @ApiProperty() targetMarket!: string;
  @ApiProperty() currentFunding!: string;
  @ApiProperty({ format: 'date-time' }) recordedAt!: string;
}

export class InitiativeSummaryResponseDto implements InitiativeSummary {
  @ApiProperty({ format: 'uuid' }) id!: string;
  @ApiProperty({ format: 'date-time' }) createdAt!: string;
  @ApiProperty({ type: ConsentRecordResponseDto, nullable: true })
  consent!: ConsentRecordResponseDto | null;
  @ApiProperty({ description: 'The latest acceptance is of the current text' })
  consentCurrent!: boolean;
  @ApiProperty({ type: InitiativeResponseDto, nullable: true })
  latestProfile!: InitiativeResponseDto | null;
}

class ConsentTermsSectionResponseDto implements ConsentTermsSection {
  @ApiProperty() heading!: string;
  @ApiProperty() body!: string;
}

export class ConsentTermsResponseDto implements ConsentTerms {
  @ApiProperty({ example: 'v1' }) version!: string;
  @ApiProperty() title!: string;
  @ApiProperty({ type: [ConsentTermsSectionResponseDto] })
  sections!: ConsentTermsSectionResponseDto[];
  @ApiProperty() checkboxLabel!: string;
  @ApiProperty({ format: 'date-time' }) publishedAt!: string;
}
