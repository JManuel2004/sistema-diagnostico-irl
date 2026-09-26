import { ApiProperty } from '@nestjs/swagger';
import {
  IsBoolean,
  IsInt,
  IsUUID,
  IsNotEmpty,
  IsString,
  Matches,
  Max,
  MaxLength,
  Min,
} from 'class-validator';
import {
  INITIATIVE_TEXT_MAX,
  type RegisterConsentCommand,
  type RegisterInitiativeCommand,
} from '@innlab/contracts';

/**
 * Body of `POST initiatives` (create an initiative accepting its consent)
 * and of `POST initiatives/:id/consent` (accept a new version of the text).
 */
export class RecordConsentRequestDto implements RegisterConsentCommand {
  @ApiProperty({
    example: 'v1',
    description: 'Version of the consent text the user read',
  })
  @Matches(/^v\d+(\.\d+)*$/)
  version!: string;
}

/**
 * Body of `POST diagnostics/:id/initiative`. The DTO checks types and
 * limits; blank texts and unknown catalog ids are rejected by the domain
 * and the use case.
 */
export class RegisterInitiativeRequestDto implements RegisterInitiativeCommand {
  @ApiProperty({ format: 'uuid', description: 'The initiative whose profile this is' })
  @IsUUID()
  initiativeId!: string;

  @ApiProperty({ example: 'AgroConecta', minLength: 3, maxLength: 120 })
  @IsString()
  @MaxLength(120)
  name!: string;

  @ApiProperty({ example: '1', description: 'Id of the sector (catalog)' })
  @IsString()
  @IsNotEmpty()
  sectorId!: string;

  @ApiProperty({ maxLength: INITIATIVE_TEXT_MAX })
  @IsString()
  @MaxLength(INITIATIVE_TEXT_MAX)
  productType!: string;

  @ApiProperty({ example: '2', description: 'Id of the stage (catalog)' })
  @IsString()
  @IsNotEmpty()
  stageId!: string;

  @ApiProperty({
    maxLength: INITIATIVE_TEXT_MAX,
    description: 'The stage in the user’s words',
  })
  @IsString()
  @MaxLength(INITIATIVE_TEXT_MAX)
  declaredStage!: string;

  @ApiProperty({ minimum: 1, maximum: 10000 })
  @IsInt()
  @Min(1)
  @Max(10000)
  teamSize!: number;

  @ApiProperty({ maxLength: INITIATIVE_TEXT_MAX })
  @IsString()
  @MaxLength(INITIATIVE_TEXT_MAX)
  teamDescription!: string;

  @ApiProperty({ description: 'Whether the initiative has a confirmed link with the university' })
  @IsBoolean()
  academicLinkage!: boolean;

  @ApiProperty({ maxLength: INITIATIVE_TEXT_MAX })
  @IsString()
  @MaxLength(INITIATIVE_TEXT_MAX)
  targetMarket!: string;

  @ApiProperty({ maxLength: INITIATIVE_TEXT_MAX })
  @IsString()
  @MaxLength(INITIATIVE_TEXT_MAX)
  currentFunding!: string;
}
