import { ApiProperty } from '@nestjs/swagger';
import type { DiagnosticSummary } from '@innlab/contracts';
import { DiagnosticResponseDto } from '../../../../diagnosis/presentation/controllers/dto/diagnosis.response.dto.js';

/** A completed diagnostic of the caller, as `GET /diagnostics` lists it. */
export class DiagnosticSummaryResponseDto
  extends DiagnosticResponseDto
  implements DiagnosticSummary
{
  @ApiProperty({
    type: String,
    nullable: true,
    example: 'AgroConecta',
    description: 'Initiative the diagnostic was answered for',
  })
  initiativeName!: string | null;

  @ApiProperty({
    type: String,
    format: 'date-time',
    nullable: true,
    description: 'When the maturity profile was computed',
  })
  profileComputedAt!: string | null;

  @ApiProperty({
    type: Number,
    nullable: true,
    minimum: 1,
    maximum: 9,
    example: 3.5,
    description: 'Global IRL level: average of the six dimensions',
  })
  globalAverage!: number | null;
}
