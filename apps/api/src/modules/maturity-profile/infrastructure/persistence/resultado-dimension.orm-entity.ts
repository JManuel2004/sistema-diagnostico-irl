import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

@Entity({ schema: 'irl_diagnostic', name: 'resultado_dimension' })
export class ResultadoDimensionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_resultado' })
  idResultado!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({
    name: 'promedio_likert',
    type: 'numeric',
    precision: 4,
    scale: 3,
    transformer: numericTransformer,
  })
  promedioLikert!: number;

  @Column({ name: 'nivel_irl', type: 'integer' })
  nivelIrl!: number;

  @Column({ name: 'en_estado_critico', type: 'boolean' })
  enEstadoCritico!: boolean;

  @Column({ name: 'es_cuello_botella', type: 'boolean' })
  esCuelloBotella!: boolean;

  @Column({ name: 'fecha_calculo', type: 'timestamptz' })
  fechaCalculo!: Date;
}
