import { Column, Entity, PrimaryColumn } from 'typeorm';

/** One acceptance of an initiative's consent; the table is a history. */
@Entity({ schema: 'irl_diagnostic', name: 'consent' })
export class ConsentOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'id_initiative', type: 'uuid' })
  idInitiative!: string;

  /** The owner of the initiative, bound to it by `fk_consent_initiative_owner`. */
  @Column({ name: 'cognito_user_id', type: 'varchar', length: 64 })
  cognitoUserId!: string;

  @Column({ name: 'terms_version', type: 'varchar', length: 16 })
  termsVersion!: string;

  @Column({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt!: Date;
}
