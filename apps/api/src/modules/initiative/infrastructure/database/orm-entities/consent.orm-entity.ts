import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'consent' })
export class ConsentOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 64 })
  keycloakUserId!: string;

  @Column({ name: 'accepted', type: 'boolean' })
  accepted!: boolean;

  @Column({ name: 'accepted_at', type: 'timestamptz' })
  acceptedAt!: Date;

  @Column({ name: 'terms_version', type: 'varchar', length: 16 })
  termsVersion!: string;
}
