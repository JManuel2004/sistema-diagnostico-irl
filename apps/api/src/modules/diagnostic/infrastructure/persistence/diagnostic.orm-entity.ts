import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'diagnostic' })
export class DiagnosticOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Index('ix_diagnostic_user')
  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 64 })
  keycloakUserId!: string;

  @Column({ name: 'started_at', type: 'timestamptz', default: () => 'now()' })
  startedAt!: Date;

  @Column({ name: 'phase_1_completed_at', type: 'timestamptz', nullable: true })
  phase1CompletedAt!: Date | null;

  @Column({ name: 'phase_2_completed_at', type: 'timestamptz', nullable: true })
  phase2CompletedAt!: Date | null;

  @Column({ name: 'state', type: 'varchar', length: 24 })
  state!: string;

  @Column({
    name: 'irl_framework_version',
    type: 'varchar',
    length: 16,
    default: 'KTH-IRL-1.0',
  })
  irlFrameworkVersion!: string;
}
