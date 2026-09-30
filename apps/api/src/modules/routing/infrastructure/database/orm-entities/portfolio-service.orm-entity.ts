import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A service of the INNLAB portfolio with its ordinal profile: the band of
 * IRL levels it serves. The stages it fits and its intensity per dimension
 * are its two child tables (`portfolio_service_stage`, `ordinal_intensity`).
 *
 * `adjustmentOnly` services take no part in the exclusions or the score:
 * only an `INCLUDE` adjustment brings them into a result. Their band may be
 * `null`; a scored service always has one (`ck_portfolio_service_scored_band`).
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

  @Column({ name: 'adjustment_only', type: 'boolean' })
  adjustmentOnly!: boolean;

  @Column({ name: 'min_level', type: 'integer', nullable: true })
  minLevel!: number | null;

  @Column({ name: 'max_level', type: 'integer', nullable: true })
  maxLevel!: number | null;
}
