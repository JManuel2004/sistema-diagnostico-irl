import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A service of the INNLAB portfolio with its ordinal profile: the band of
 * IRL levels it serves. The stages it fits and its intensity per dimension
 * are its two child tables (`portfolio_service_stage`, `ordinal_intensity`).
 */
@Entity({ schema: 'irl_catalog', name: 'portfolio_service' })
export class PortfolioServiceOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  idService!: number;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'description', type: 'varchar', length: 500, nullable: true })
  description!: string | null;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;

  @Column({ name: 'min_level', type: 'integer' })
  minLevel!: number;

  @Column({ name: 'max_level', type: 'integer' })
  maxLevel!: number;
}
