import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../../shared/kernel/infrastructure/database/numeric.transformer.js';

/**
 * One place of a recommendation's ranking: position 1 is the recommended
 * service, the following ones its alternatives. A place an `INCLUDE`
 * adjustment added has no score and records the rule instead
 * (`ck_recommendation_rank_origin`).
 */
@Entity({ schema: 'irl_diagnostic', name: 'recommendation_rank' })
export class RecommendationRankOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_recommendation', type: 'bigint' })
  idRecommendation!: string;

  @Column({ name: 'id_service', type: 'integer' })
  idService!: number;

  @Column({ name: 'service_snapshot', type: 'varchar', length: 80 })
  serviceSnapshot!: string;

  @Column({ name: 'position', type: 'integer' })
  position!: number;

  @Column({
    name: 'score',
    type: 'numeric',
    precision: 8,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  score!: number | null;

  @Column({
    name: 'included_by_rule',
    type: 'varchar',
    length: 16,
    nullable: true,
  })
  includedByRule!: string | null;
}
