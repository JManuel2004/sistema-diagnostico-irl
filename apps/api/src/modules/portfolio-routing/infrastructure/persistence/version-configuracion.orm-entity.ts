import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The unit of publication. Pins exactly one calibration snapshot and one
 * parameter snapshot, and owns the four published artefacts the engine
 * reads.
 *
 * At most one row may carry `estado = 'VIGENTE'`, enforced by the partial
 * unique index `ux_version_unica_vigente` rather than by application code,
 * so the guarantee holds even under a concurrent publish.
 */
@Entity({ schema: 'irl_catalog', name: 'version_configuracion' })
export class VersionConfiguracionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_version_configuracion' })
  idVersionConfiguracion!: string;

  @Column({ name: 'numero', type: 'integer' })
  numero!: number;

  @Column({ name: 'autor_id', type: 'varchar', length: 64 })
  autorId!: string;

  @Column({ name: 'comentario', type: 'varchar', length: 500, nullable: true })
  comentario!: string | null;

  @Column({ name: 'id_snapshot_calibracion', type: 'bigint' })
  idSnapshotCalibracion!: string;

  @Column({ name: 'id_snapshot_parametros', type: 'bigint' })
  idSnapshotParametros!: string;

  @Column({ name: 'estado', type: 'varchar', length: 16 })
  estado!: string;

  @Column({ name: 'vigente_desde', type: 'timestamptz', default: () => 'now()' })
  vigenteDesde!: Date;

  @Column({ name: 'vigente_hasta', type: 'timestamptz', nullable: true })
  vigenteHasta!: Date | null;
}
