import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Route parameters of every endpoint under `diagnostics/:id`. */
export class DiagnosticIdParam {
  @ApiProperty({ description: 'Diagnostic id', format: 'uuid' })
  @IsUUID()
  id!: string;
}
