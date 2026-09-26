import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { ExcludedService } from '../../../domain/services/eligibility-filter.service.js';
import type {
  AppliedException,
  DiscardedException,
} from '../../../domain/services/exception-engine.service.js';
import type { ScoredCandidate } from '../../../domain/value-objects/scored-candidate.vo.js';

/**
 * The recommendation for a diagnostic, with its trace by layers.
 *
 * `id_diagnostic` is unique: one recommendation per diagnostic (RF-15), and
 * computing it again replaces it. Its ranking lives in `recommendation_rank`
 * (position 1 is the recommended service); a `NO_RECOMMENDATION` has none.
 * `criterion_justification` holds the justification of a recommendation or
 * the reason for not recommending, as `result_type` says.
 *
 * The trace is the audit of the computation: what each layer of the engine
 * did, kept with the recommendation it explains.
 */
@Entity({ schema: 'irl_diagnostic', name: 'portfolio_recommendation' })
export class PortfolioRecommendationOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idRecommendation!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'result_type', type: 'varchar', length: 24 })
  resultType!: string;

  @Column({ name: 'criterion_justification', type: 'varchar', length: 1100 })
  criterionJustification!: string;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;

  @Column({ name: 'layer_1_excluded', type: 'jsonb' })
  layer1Excluded!: ExcludedService[];

  @Column({ name: 'ranking_before_exceptions', type: 'jsonb' })
  rankingBeforeExceptions!: ScoredCandidate[];

  @Column({ name: 'applied_exceptions', type: 'jsonb' })
  appliedExceptions!: AppliedException[];

  @Column({ name: 'discarded_exceptions', type: 'jsonb' })
  discardedExceptions!: DiscardedException[];

  @Column({ name: 'ranking_after_exceptions', type: 'jsonb' })
  rankingAfterExceptions!: ScoredCandidate[];

  @Column({ name: 'incomplete_characterization', type: 'jsonb' })
  incompleteCharacterization!: string[];

  @Column({ name: 'facts_hash', type: 'varchar', length: 64 })
  factsHash!: string;
}
