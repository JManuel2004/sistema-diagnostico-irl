import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'regla_enrutamiento' })
export class ReglaEnrutamientoOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_regla' })
  idRegla!: string;

  @Column({ name: 'id_servicio', type: 'integer' })
  idServicio!: number;

  @Column({ name: 'condicion', type: 'varchar', length: 2000 })
  condicion!: string;

  @Column({ name: 'prioridad', type: 'integer' })
  prioridad!: number;

  @Column({ name: 'descripcion', type: 'varchar', length: 500, nullable: true })
  descripcion!: string | null;

  @Column({ name: 'activa', type: 'boolean', default: true })
  activa!: boolean;
}
