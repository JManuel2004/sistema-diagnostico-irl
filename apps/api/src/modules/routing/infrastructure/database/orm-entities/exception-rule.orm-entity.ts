import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { Predicate } from '@innlab/contracts';

/**
 * A deliberate adjustment of the center. Layer 3: it moves a scored service
 * in the computed ranking, or includes an adjustment-only one.
 *
 * `code` is the stable business identifier (E-02, INC-01, ...) used when
 * attributing an outcome to the adjustment that caused it — a synthetic
 * primary key would not survive a republish.
 *
 * `priorityOrder` is unique, so application order is total and
 * deterministic.
 */
@Entity({ schema: 'irl_catalog', name: 'exception_rule' })
export class ExceptionRuleOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'code', type: 'varchar', length: 16 })
  code!: string;

  @Column({ name: 'predicate', type: 'jsonb' })
  predicate!: Predicate;

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

  /**
   * The target service's `adjustment_only`, carried by the composite foreign
   * key: `INCLUDE` requires it, every other action forbids it.
   */
  @Column({ name: 'target_adjustment_only', type: 'boolean' })
  targetAdjustmentOnly!: boolean;
}
