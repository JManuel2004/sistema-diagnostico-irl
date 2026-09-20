import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A hard filter. Layer 1: a service either qualifies or it does not. */
@Entity({ schema: 'irl_catalog', name: 'published_eligibility_rule' })
export class PublishedEligibilityRuleOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_service', type: 'integer' })
  idService!: number;

  @Column({ name: 'predicate', type: 'jsonb' })
  predicate!: unknown;

  @Column({ name: 'exclusion_message', type: 'varchar', length: 500 })
  exclusionMessage!: string;
}
