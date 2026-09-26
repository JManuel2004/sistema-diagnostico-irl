import { ApiProperty } from '@nestjs/swagger';
import { IsUUID } from 'class-validator';

/** Path parameter `:id` of the `initiatives/:id/...` routes. */
export class InitiativeIdParam {
  @ApiProperty({ format: 'uuid', description: 'Initiative id' })
  @IsUUID()
  id!: string;
}
