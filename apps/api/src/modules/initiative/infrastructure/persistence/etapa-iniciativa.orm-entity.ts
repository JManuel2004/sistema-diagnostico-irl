import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Closed catalogue of initiative stages. A table rather than a CHECK
 * constraint because the stage vocabulary is exactly the kind of thing
 * that changes without warranting a schema change.
 */
@Entity({ schema: 'irl_catalog', name: 'etapa_iniciativa' })
export class EtapaIniciativaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_etapa' })
  idEtapa!: string;

  @Column({ name: 'codigo', type: 'varchar', length: 24 })
  codigo!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 80 })
  nombre!: string;

  @Column({ name: 'orden', type: 'integer' })
  orden!: number;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
