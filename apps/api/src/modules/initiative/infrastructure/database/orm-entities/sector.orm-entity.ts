import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'sector' })
export class SectorOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'name', type: 'varchar', length: 120 })
  name!: string;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
