import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * The principal recommendation for a diagnostic.
 *
 * `id_diagnostico` is UNIQUE at the database level, which is what keeps
 * RF-15's "exactly one recommendation, not an ordered list" true no matter
 * what the application does. The runners-up live in
 * `alternativa_recomendacion`, subordinate to this row.
 *
 * `resultadoTipo` distinguishes a real recommendation from the legitimate
 * outcome where every candidate fell below the cutoff or was excluded. In
 * the second case the service columns are NULL — the coherence CHECK
 * `ck_recomendacion_coherencia` makes the two shapes mutually exclusive,
 * so a half-filled row cannot exist.
 */
@Entity({ schema: 'irl_diagnostic', name: 'recomendacion_portafolio' })
export class RecomendacionPortafolioOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_recomendacion' })
  idRecomendacion!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_version_configuracion', type: 'bigint' })
  idVersionConfiguracion!: string;

  @Column({ name: 'resultado_tipo', type: 'varchar', length: 24 })
  resultadoTipo!: string;

  @Column({ name: 'id_servicio_principal', type: 'integer', nullable: true })
  idServicioPrincipal!: number | null;

  @Column({
    name: 'puntaje_principal',
    type: 'numeric',
    precision: 6,
    scale: 3,
    nullable: true,
    transformer: numericTransformer,
  })
  puntajePrincipal!: number | null;

  @Column({
    name: 'servicio_snapshot',
    type: 'varchar',
    length: 80,
    nullable: true,
  })
  servicioSnapshot!: string | null;

  @Column({
    name: 'justificacion_criterio',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  justificacionCriterio!: string | null;

  @Column({ name: 'fecha_generacion', type: 'timestamptz' })
  fechaGeneracion!: Date;
}
