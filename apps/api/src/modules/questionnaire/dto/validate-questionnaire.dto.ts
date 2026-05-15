import { Type } from 'class-transformer';
import { IsInt, IsOptional, Max, Min, ValidateNested } from 'class-validator';

class DimensionAnswersDto {
  @IsOptional() @IsInt() @Min(1) @Max(5) q1?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q2?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q3?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q4?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q5?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q6?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q7?: number;
  @IsOptional() @IsInt() @Min(1) @Max(5) q8?: number;
}

export class ValidateQuestionnaireDto {
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) trl?: DimensionAnswersDto;
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) crl?: DimensionAnswersDto;
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) brl?: DimensionAnswersDto;
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) iprl?: DimensionAnswersDto;
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) tmrl?: DimensionAnswersDto;
  @IsOptional() @ValidateNested() @Type(() => DimensionAnswersDto) frl?: DimensionAnswersDto;
}
