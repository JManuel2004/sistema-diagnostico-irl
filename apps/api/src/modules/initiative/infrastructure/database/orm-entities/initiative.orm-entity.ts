import { Column, Entity, PrimaryColumn } from 'typeorm';

/** An initiative with an identity of its own, owned by a user. */
@Entity({ schema: 'irl_diagnostic', name: 'initiative' })
export class InitiativeOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'cognito_user_id', type: 'varchar', length: 64 })
  cognitoUserId!: string;

  @Column({ name: 'created_at', type: 'timestamptz', default: () => 'now()' })
  createdAt!: Date;
}
