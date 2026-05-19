import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'diagnostico' })
export class DiagnosticoOrm {
  @PrimaryColumn({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Index('ix_diagnostico_keycloak')
  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 64 })
  keycloakUserId!: string;

  @Column({ name: 'fecha_inicio', type: 'timestamptz', default: () => 'now()' })
  fechaInicio!: Date;

  @Column({ name: 'fecha_fin_fase_1', type: 'timestamptz', nullable: true })
  fechaFinFase1!: Date | null;

  @Column({ name: 'fecha_fin_fase_2', type: 'timestamptz', nullable: true })
  fechaFinFase2!: Date | null;

  @Column({ name: 'estado', type: 'varchar', length: 24 })
  estado!: string;

  @Column({
    name: 'version_marco_irl',
    type: 'varchar',
    length: 16,
    default: 'KTH-IRL-1.0',
  })
  versionMarcoIrl!: string;
}
