import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'evento_auditoria' })
export class EventoAuditoriaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_evento' })
  idEvento!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'tipo_evento', type: 'varchar', length: 40 })
  tipoEvento!: string;

  @Column({
    name: 'keycloak_user_id',
    type: 'varchar',
    length: 64,
    nullable: true,
  })
  keycloakUserId!: string | null;

  @Column({ name: 'timestamp_evento', type: 'timestamptz' })
  timestampEvento!: Date;

  @Column({ name: 'metadata', type: 'varchar', length: 4000, nullable: true })
  metadata!: string | null;
}
