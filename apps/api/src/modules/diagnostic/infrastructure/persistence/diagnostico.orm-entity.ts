import { Column, Entity, Index, PrimaryColumn } from 'typeorm';

/**
 * ORM entity for `irl_diagnostic.diagnostico`.
 *
 * The `estado` CHECK constraint (initial migration) lists the same
 * state names as `DiagnosticState`. Both layers enforce the invariant
 * — the DB rejects unknown values on write, the domain refuses to
 * construct them on read.
 *
 * `id_usuario` is `text` (not a FK into a local table) because the
 * authoritative user identity lives in Keycloak / InnLab Core, not in
 * this database.
 */
@Entity({ schema: 'irl_diagnostic', name: 'diagnostico' })
export class DiagnosticoOrm {
  @PrimaryColumn({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Index('ix_diagnostico_usuario')
  @Column({ name: 'id_usuario', type: 'text' })
  idUsuario!: string;

  @Column({ name: 'estado', type: 'text' })
  estado!: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn!: Date;

  @Column({
    name: 'actualizado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  actualizadoEn!: Date;
}
