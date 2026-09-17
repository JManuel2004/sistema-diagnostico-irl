import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * One rung of the ordinal scale: the label the business side reads, and
 * the number the scorer multiplies. `monotonicityOrder` makes the
 * "principal > secundario > marginal > no_aplica" check deterministic.
 */
@Entity({ schema: 'irl_catalog', name: 'calibration_label_value' })
export class CalibrationLabelValueOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_calibration_snapshot', type: 'bigint' })
  idCalibrationSnapshot!: string;

  @Column({ name: 'label', type: 'varchar', length: 24 })
  label!: string;

  @Column({
    name: 'numeric_value',
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: numericTransformer,
  })
  numericValue!: number;

  @Column({ name: 'monotonicity_order', type: 'integer' })
  monotonicityOrder!: number;
}
