import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'sector' })
export class SectorOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_sector' })
  idSector!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 120 })
  nombre!: string;

  @Column({ name: 'activo', type: 'boolean', default: true })
  activo!: boolean;
}
