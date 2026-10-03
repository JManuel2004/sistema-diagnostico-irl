import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A tier of the portfolio: how deep its services go, from the lightest
 * (`sequence` 1, Descubre) to the deepest (Alíate).
 */
@Entity({ schema: 'irl_catalog', name: 'service_tier' })
export class ServiceTierOrm {
  @PrimaryGeneratedColumn({ type: 'smallint', name: 'id' })
  id!: number;

  @Column({ name: 'code', type: 'varchar', length: 16 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 40 })
  name!: string;

  @Column({ name: 'sequence', type: 'smallint' })
  sequence!: number;

  @Column({ name: 'tagline', type: 'varchar', length: 120, nullable: true })
  tagline!: string | null;

  @Column({ name: 'description', type: 'varchar', length: 300, nullable: true })
  description!: string | null;
}
