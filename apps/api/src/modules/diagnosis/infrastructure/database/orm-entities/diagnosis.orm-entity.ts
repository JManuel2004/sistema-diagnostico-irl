import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'diagnostic' })
export class DiagnosisOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'cognito_user_id', type: 'varchar', length: 64 })
  cognitoUserId!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt!: Date;

  /** When the diagnostic's maturity profile was generated. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'state', type: 'varchar', length: 32 })
  state!: string;

  /** The framework version (statements, conversion table) it is answered with. */
  @Column({ name: 'id_framework_version', type: 'smallint' })
  idFrameworkVersion!: number;

  /** When the portfolio recommendation of the deep analysis was saved. */
  @Column({ name: 'recommendation_calculated_at', type: 'timestamptz', nullable: true })
  recommendationCalculatedAt!: Date | null;

  /** When the scaling roadmap of the deep analysis was saved. */
  @Column({ name: 'roadmap_calculated_at', type: 'timestamptz', nullable: true })
  roadmapCalculatedAt!: Date | null;
}
