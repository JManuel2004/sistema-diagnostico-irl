import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'respuesta' })
@Index('uq_respuesta_diag_afirmacion', ['idDiagnostico', 'idAfirmacion'], {
  unique: true,
})
export class RespuestaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_respuesta' })
  idRespuesta!: string;

  @Index('ix_respuesta_diagnostico')
  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_afirmacion', type: 'bigint' })
  idAfirmacion!: string;

  @Column({ name: 'valor_likert', type: 'integer' })
  valorLikert!: number;

  @Column({
    name: 'fecha_respuesta',
    type: 'timestamptz',
    default: () => 'now()',
  })
  fechaRespuesta!: Date;
}
