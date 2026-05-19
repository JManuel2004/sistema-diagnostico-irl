import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'consentimiento' })
export class ConsentimientoOrm {
  @PrimaryColumn({ name: 'id_consentimiento', type: 'uuid' })
  idConsentimiento!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 64 })
  keycloakUserId!: string;

  @Column({ name: 'aceptado', type: 'boolean' })
  aceptado!: boolean;

  @Column({ name: 'timestamp_aceptacion', type: 'timestamptz' })
  timestampAceptacion!: Date;

  @Column({ name: 'version_terminos', type: 'varchar', length: 16 })
  versionTerminos!: string;
}
