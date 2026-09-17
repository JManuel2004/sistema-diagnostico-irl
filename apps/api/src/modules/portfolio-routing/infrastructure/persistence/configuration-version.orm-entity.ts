import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The unit of publication. Pins exactly one calibration snapshot and one
 * parameter snapshot, and owns the four published artefacts the engine
 * reads.
 *
 * At most one row may carry `state = 'ACTIVE'`, enforced by the partial
 * unique index `ux_version_unica_vigente` rather than by application code,
 * so the guarantee holds even under a concurrent publish.
 */
@Entity({ schema: 'irl_catalog', name: 'configuration_version' })
export class ConfigurationVersionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idConfigurationVersion!: string;

  @Column({ name: 'number', type: 'integer' })
  number!: number;

  @Column({ name: 'author_id', type: 'varchar', length: 64 })
  authorId!: string;

  @Column({ name: 'comment', type: 'varchar', length: 500, nullable: true })
  comment!: string | null;

  @Column({ name: 'id_calibration_snapshot', type: 'bigint' })
  idCalibrationSnapshot!: string;

  @Column({ name: 'id_parameters_snapshot', type: 'bigint' })
  idParametersSnapshot!: string;

  @Column({ name: 'state', type: 'varchar', length: 16 })
  state!: string;

  @Column({ name: 'valid_from', type: 'timestamptz', default: () => 'now()' })
  vigenteDesde!: Date;

  @Column({ name: 'valid_until', type: 'timestamptz', nullable: true })
  vigenteHasta!: Date | null;
}
