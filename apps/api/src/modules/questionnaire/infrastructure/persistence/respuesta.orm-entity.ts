import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * ORM entity for `irl_diagnostic.respuesta` — one Likert answer.
 *
 * The CHECK constraint `valor_likert BETWEEN 1 AND 5` and the unique
 * constraint `UNIQUE (id_diagnostico, id_afirmacion)` are declared in
 * the migration; the domain (`LikertValue` value object,
 * `AnswerSheet.fromPersistence`) repeats the invariant for defense in
 * depth.
 *
 * Foreign keys are tracked as plain UUID columns rather than relations
 * because the repository never needs to join — answers are always
 * loaded by `id_diagnostico` and the `id_afirmacion` is opaque to this
 * module (the catalog module owns the statement entity).
 */
@Entity({ schema: 'irl_diagnostic', name: 'respuesta' })
@Index(
  'uq_respuesta_diagnostico_afirmacion',
  ['idDiagnostico', 'idAfirmacion'],
  {
    unique: true,
  },
)
export class RespuestaOrm {
  @PrimaryColumn({ name: 'id_respuesta', type: 'uuid' })
  idRespuesta!: string;

  @Index('ix_respuesta_diagnostico')
  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_afirmacion', type: 'uuid' })
  idAfirmacion!: string;

  @Column({ name: 'valor_likert', type: 'smallint' })
  valorLikert!: number;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn!: Date;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn!: Date;
}
