import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'diagnostic' })
export class DiagnosisOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Index('ix_diagnostic_user')
  @Column({ name: 'cognito_user_id', type: 'varchar', length: 64 })
  cognitoUserId!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt!: Date;

  /** When the diagnostic's maturity profile was generated. */
  @Column({ name: 'completed_at', type: 'timestamptz', nullable: true })
  completedAt!: Date | null;

  @Column({ name: 'state', type: 'varchar', length: 32 })
  state!: string;

  @Column({
    name: 'irl_framework_version',
    type: 'varchar',
    length: 16,
    default: 'KTH-IRL-1.0',
  })
  irlFrameworkVersion!: string;
}
