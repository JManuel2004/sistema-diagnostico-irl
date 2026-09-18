import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'portfolio_service' })
export class PortfolioServiceOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  idService!: number;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'isActive', type: 'boolean', default: true })
  isActive!: boolean;
}
