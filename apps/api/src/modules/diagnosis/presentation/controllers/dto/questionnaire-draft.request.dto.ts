import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  ArrayMaxSize,
  IsArray,
  IsInt,
  IsNotEmpty,
  IsOptional,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import {
  ANSWER_JUSTIFICATION_MAX,
  type DraftEntry,
  type SaveQuestionnaireDraftRequest,
} from '@innlab/contracts';

/**
 * One statement of the draft as it arrives over HTTP. Level and
 * justification are both optional; the length of the justification is
 * decided by the domain (a blank one counts as missing).
 */
export class DraftEntryRequestDto implements DraftEntry {
  @ApiProperty({ example: '1', description: 'Statement id (bigint as string)' })
  @IsString()
  @IsNotEmpty()
  statementId!: string;

  @ApiProperty({ minimum: 1, maximum: 5, nullable: true, type: Number })
  @IsOptional()
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number | null;

  @ApiProperty({
    maxLength: ANSWER_JUSTIFICATION_MAX,
    nullable: true,
    type: String,
  })
  @IsOptional()
  @IsString()
  justification!: string | null;
}

/** Body of `PUT /diagnostics/:id/questionnaire/draft`: the whole draft. */
export class SaveQuestionnaireDraftRequestDto implements SaveQuestionnaireDraftRequest {
  @ApiProperty({ type: [DraftEntryRequestDto], maxItems: 48 })
  @IsArray()
  @ArrayMaxSize(48)
  @ValidateNested({ each: true })
  @Type(() => DraftEntryRequestDto)
  entries!: DraftEntryRequestDto[];
}
