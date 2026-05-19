import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'descarga_reporte' })
export class DescargaReporteOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_descarga' })
  idDescarga!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'keycloak_user_id', type: 'varchar', length: 64 })
  keycloakUserId!: string;

  @Column({ name: 'timestamp_descarga', type: 'timestamptz' })
  timestampDescarga!: Date;

  @Column({ name: 'formato', type: 'varchar', length: 8 })
  formato!: string;

  @Column({ name: 'tamano_bytes', type: 'integer', nullable: true })
  tamanoBytes!: number | null;

  @Column({ name: 'incluye_atribucion', type: 'boolean' })
  incluyeAtribucion!: boolean;
}
