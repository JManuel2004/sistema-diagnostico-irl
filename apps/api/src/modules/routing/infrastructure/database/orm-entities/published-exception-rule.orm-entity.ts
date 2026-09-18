import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A deliberate override of the computed ranking. Layer 3.
 *
 * `code` is the stable business identifier (E-01, E-02, ...) used when
 * attributing an outcome to the adjustment that caused it — a synthetic
 * primary key would not survive a republish.
 *
 * `priorityOrder` is unique, so application order is total and
 * deterministic.
 */
@Entity({ schema: 'irl_catalog', name: 'published_exception_rule' })
export class PublishedExceptionRuleOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 16 })
  code!: string;

  @Column({ name: 'predicate', type: 'jsonb' })
  predicate!: unknown;

  @Column({ name: 'expression_tree', type: 'jsonb' })
  expressionTree!: unknown;

  @Column({ name: 'action', type: 'varchar', length: 16 })
  action!: string;

  @Column({ name: 'id_target_service', type: 'integer' })
  idTargetService!: number;

  @Column({ name: 'positions', type: 'integer', nullable: true })
  positions!: number | null;

  @Column({ name: 'declared_reason', type: 'varchar', length: 1000 })
  declaredReason!: string;

  @Column({ name: 'priority_order', type: 'integer' })
  priorityOrder!: number;

  @Column({ name: 'rule_hash', type: 'varchar', length: 64 })
  ruleHash!: string;
}
