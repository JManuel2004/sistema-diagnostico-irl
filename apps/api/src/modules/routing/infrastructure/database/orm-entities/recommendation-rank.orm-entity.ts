import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../../shared/kernel/infrastructure/database/numeric.transformer.js';

/**
 * One place of a recommendation's ranking: position 1 is the recommended
 * service, the following ones its alternatives.
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
    transformer: numericTransformer,
  })
  score!: number;
}
