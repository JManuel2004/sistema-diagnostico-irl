import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * Closed catalogue of initiative stages. A table rather than a CHECK
 * constraint because the stage vocabulary is exactly the kind of thing
 * that changes without warranting a schema change.
 */
@Entity({ schema: 'irl_catalog', name: 'initiative_stage' })
export class InitiativeStageOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 24 })
  code!: string;

  @Column({ name: 'name', type: 'varchar', length: 80 })
  name!: string;

  @Column({ name: 'sequence', type: 'integer' })
  sequence!: number;

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
