import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * An immutable snapshot of the ordinal scale.
 *
 * Published snapshots are never updated: a `version_configuracion` pins
 * one, and replaying an old recommendation resolves its labels against
 * that snapshot rather than against whatever is current.
 */
@Entity({ schema: 'irl_catalog', name: 'snapshot_calibracion' })
export class SnapshotCalibracionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_snapshot_calibracion' })
  idSnapshotCalibracion!: string;

  @Column({ name: 'numero', type: 'integer' })
  numero!: number;

  @Column({ name: 'autor_id', type: 'varchar', length: 64 })
  autorId!: string;

  @Column({ name: 'comentario', type: 'varchar', length: 500, nullable: true })
  comentario!: string | null;

  @Column({ name: 'estado', type: 'varchar', length: 16 })
  estado!: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn!: Date;
}
