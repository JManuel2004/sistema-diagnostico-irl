import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Predicate } from '@innlab/contracts';

/** A hard filter. Layer 1: a service either qualifies or it does not. */
@Entity({ schema: 'irl_catalog', name: 'eligibility_rule' })
export class EligibilityRuleOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  /** Stable code of the rule (`ELG-01`), the one the trace records. */
  @Column({ name: 'code', type: 'varchar', length: 16 })
  code!: string;

  @Column({ name: 'id_service', type: 'integer' })
  idService!: number;

  @Column({ name: 'predicate', type: 'jsonb' })
  predicate!: Predicate;

  @Column({ name: 'exclusion_message', type: 'varchar', length: 500 })
  exclusionMessage!: string;
}
