import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'notificacion' })
export class NotificacionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_notificacion' })
  idNotificacion!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'tipo', type: 'varchar', length: 16 })
  tipo!: string;

  @Column({ name: 'destinatario', type: 'varchar', length: 200 })
  destinatario!: string;

  @Column({ name: 'timestamp_envio', type: 'timestamptz' })
  timestampEnvio!: Date;

  @Column({ name: 'estado_envio', type: 'varchar', length: 16 })
  estadoEnvio!: string;

  @Column({
    name: 'mensaje_error',
    type: 'varchar',
    length: 500,
    nullable: true,
  })
  mensajeError!: string | null;

  @Column({ name: 'numero_intentos', type: 'integer', default: 0 })
  numeroIntentos!: number;
}
