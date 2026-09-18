import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../../infrastructure/database/numeric.transformer.js';

/**
 * The principal recommendation for a diagnostic.
 *
 * `id_diagnostico` is UNIQUE at the database level, which is what keeps
 * RF-15's "exactly one recommendation, not an ordered list" true no matter
 * what the application does. The runners-up live in
 * `alternativa_recomendacion`, subordinate to this row.
 *
 * `resultType` distinguishes a real recommendation from the legitimate
 * outcome where every candidate fell below the cutoff or was excluded. In
 * the second case the service columns are NULL — the coherence CHECK
 * `ck_recomendacion_coherencia` makes the two shapes mutually exclusive,
 * so a half-filled row cannot exist.
 */
@Entity({ schema: 'irl_diagnostic', name: 'portfolio_recommendation' })
export class PortfolioRecommendationOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idRecommendation!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'result_type', type: 'varchar', length: 24 })
  resultType!: string;

  @Column({ name: 'id_primary_service', type: 'integer', nullable: true })
  idPrimaryService!: number | null;

  @Column({
    name: 'primary_score',
    type: 'numeric',
    precision: 6,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  primaryScore!: number | null;

  @Column({
    name: 'service_snapshot',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  serviceSnapshot!: string | null;

  @Column({
    name: 'criterion_justification',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  criterionJustification!: string | null;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
