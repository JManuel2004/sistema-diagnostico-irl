import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * How strongly a service addresses one dimension, as a label of the
 * calibration scale (`calibration_label_value`), referenced by id.
 */
@Entity({ schema: 'irl_catalog', name: 'ordinal_intensity' })
export class OrdinalIntensityOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_service', type: 'integer' })
  idService!: number;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'id_calibration_label', type: 'bigint' })
  idCalibrationLabel!: string;
}
