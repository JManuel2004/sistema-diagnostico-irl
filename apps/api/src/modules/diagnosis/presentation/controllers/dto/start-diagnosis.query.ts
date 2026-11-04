import { ApiPropertyOptional } from '@nestjs/swagger';
import { IsIn, IsOptional } from 'class-validator';

/** Query of `POST /diagnostics`. */
export class StartDiagnosisQuery {
  @ApiPropertyOptional({
    enum: ['true', 'false'],
    description:
      'The user chose to discard the diagnostic they have in progress. Without it, having one ' +
      'answers 409 `DIAGNOSIS_IN_PROGRESS` and nothing is deleted.',
  })
  @IsOptional()
  @IsIn(['true', 'false'])
  discardInProgress?: 'true' | 'false';
}
