import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsOptional, IsString, MaxLength } from 'class-validator';

/** Query of `GET catalog/questionnaire`: the framework version to read. */
export class QuestionnaireVersionQuery {
  @ApiPropertyOptional({
    example: 'KTH-IRL-1.0',
    description: 'Framework version code; the current one when omitted',
  })
  @IsOptional()
  @IsString()
  @MaxLength(16)
  version?: string;
}
