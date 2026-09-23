import { ApiProperty } from '@nestjs/swagger';
import { Type } from 'class-transformer';
import {
  IsArray,
  IsInt,
  IsNotEmpty,
  IsString,
  Max,
  Min,
  ValidateNested,
} from 'class-validator';
import { ANSWER_JUSTIFICATION_MAX } from '@innlab/contracts';

/**
 * One answer as it arrives over HTTP. The DTO checks the shape; whether the
 * justification is blank or too long, and whether there are exactly 48
 * answers, is decided by the domain (`Answer`, `AnswerSheet`).
 */
export class AnswerRequestDto {
  @ApiProperty({ example: '1', description: 'Statement id (bigint as string)' })
  @IsString()
  @IsNotEmpty()
  statementId!: string;

  @ApiProperty({
    example: 4,
    minimum: 1,
    maximum: 5,
    description: 'Likert value',
  })
  @IsInt()
  @Min(1)
  @Max(5)
  value!: number;

  @ApiProperty({
    example: 'Tenemos un prototipo probado con tres productores.',
    maxLength: ANSWER_JUSTIFICATION_MAX,
    description: 'Why the user chose that level; mandatory',
  })
  @IsString()
  justification!: string;
}

/** Body of `finalize-initial` and `questionnaire`: the 48 answers. */
export class AnswersRequestDto {
  @ApiProperty({ type: [AnswerRequestDto], minItems: 48, maxItems: 48 })
  @IsArray()
  @ValidateNested({ each: true })
  @Type(() => AnswerRequestDto)
  answers!: AnswerRequestDto[];
}
