import { ApiProperty } from '@nestjs/swagger';

export class StatementResponseDto {
  @ApiProperty({ example: '1', description: 'Bigint PK as string' })
  id!: string;

  @ApiProperty({ example: 'TRL' })
  dimensionCode!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 8 })
  sequence!: number;

  @ApiProperty({
    example: 'Contamos con un prototipo funcional validado en laboratorio.',
  })
  text!: string;
}

export class DimensionWithStatementsDto {
  @ApiProperty({ example: 'TRL' })
  code!: string;

  @ApiProperty({ example: 'Technology Readiness Level' })
  name!: string;

  @ApiProperty({ example: 'Grado de madurez tecnológica de la innovación.' })
  description!: string;

  @ApiProperty({ example: 1, minimum: 1, maximum: 6 })
  sequence!: number;

  @ApiProperty({ type: [StatementResponseDto] })
  statements!: StatementResponseDto[];
}

export class QuestionnaireStructureResponseDto {
  @ApiProperty({ example: 'KTH-IRL-1.0' })
  versionMarco!: string;

  @ApiProperty({ type: [DimensionWithStatementsDto] })
  dimensions!: DimensionWithStatementsDto[];
}
