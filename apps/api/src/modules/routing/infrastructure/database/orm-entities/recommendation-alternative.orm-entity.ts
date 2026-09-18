import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../../infrastructure/database/numeric.transformer.js';

/**
 * Positions 2..N of the ranking that accompany the principal
 * recommendation. `position >= 2` by CHECK: position 1 is the principal
 * service and lives on `recomendacion_portafolio` itself.
 */
@Entity({ schema: 'irl_diagnostic', name: 'recommendation_alternative' })
export class RecommendationAlternativeOrm {
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
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  score!: number;
}
