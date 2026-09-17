import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

@Entity({ schema: 'irl_diagnostic', name: 'dimension_result' })
export class DimensionResultOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({
    name: 'likert_average',
    type: 'numeric',
    precision: 4,
    scale: 3,
    transformer: numericTransformer,
  })
  likertAverage!: number;

  @Column({ name: 'irl_level', type: 'integer' })
  irlLevel!: number;

  @Column({ name: 'in_critical_state', type: 'boolean' })
  inCriticalState!: boolean;

  @Column({ name: 'is_bottleneck', type: 'boolean' })
  isBottleneck!: boolean;

  @Column({ name: 'computed_at', type: 'timestamptz' })
  computedAt!: Date;
}
