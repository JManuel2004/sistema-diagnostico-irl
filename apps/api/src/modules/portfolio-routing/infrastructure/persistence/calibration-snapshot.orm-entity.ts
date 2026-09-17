import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * An immutable snapshot of the ordinal scale.
 *
 * Published snapshots are never updated: a `version_configuracion` pins
 * one, and replaying an old recommendation resolves its labels against
 * that snapshot rather than against whatever is current.
 */
@Entity({ schema: 'irl_catalog', name: 'calibration_snapshot' })
export class CalibrationSnapshotOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idCalibrationSnapshot!: string;

  @Column({ name: 'number', type: 'integer' })
  number!: number;

  @Column({ name: 'author_id', type: 'varchar', length: 64 })
  authorId!: string;

  @Column({ name: 'comment', type: 'varchar', length: 500, nullable: true })
  comment!: string | null;

  @Column({ name: 'state', type: 'varchar', length: 16 })
  state!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
