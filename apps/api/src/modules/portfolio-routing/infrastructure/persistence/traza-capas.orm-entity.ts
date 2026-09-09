import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * The audit record of one evaluation: what each layer did, and against
 * which frozen configuration it did it.
 *
 * `excepcionesActivadas` holds the ranking before and after *each*
 * individual exception, not just the aggregate outcome. Without that
 * granularity a recommendation questioned months later cannot be
 * attributed to the specific adjustment that produced it — which is the
 * whole point of keeping the trace.
 *
 * The three snapshot ids are denormalised from the version on purpose:
 * reproducing an evaluation must not depend on the version row still
 * pointing where it pointed at the time.
 */
@Entity({ schema: 'irl_diagnostic', name: 'traza_capas' })
export class TrazaCapasOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_traza' })
  idTraza!: string;

  @Column({ name: 'id_recomendacion', type: 'bigint' })
  idRecomendacion!: string;

  @Column({ name: 'excluidos_capa_1', type: 'jsonb' })
  excluidosCapa1!: unknown;

  @Column({ name: 'ranking_pre_excepcion', type: 'jsonb' })
  rankingPreExcepcion!: unknown;

  @Column({ name: 'excepciones_activadas', type: 'jsonb' })
  excepcionesActivadas!: unknown;

  @Column({ name: 'excepciones_descartadas', type: 'jsonb' })
  excepcionesDescartadas!: unknown;

  @Column({ name: 'ranking_post_excepcion', type: 'jsonb' })
  rankingPostExcepcion!: unknown;

  @Column({ name: 'id_version_configuracion', type: 'bigint' })
  idVersionConfiguracion!: string;

  @Column({ name: 'id_snapshot_calibracion', type: 'bigint' })
  idSnapshotCalibracion!: string;

  @Column({ name: 'id_snapshot_parametros', type: 'bigint' })
  idSnapshotParametros!: string;

  @Column({ name: 'hash_hechos', type: 'varchar', length: 64 })
  hashHechos!: string;

  @Column({ name: 'evaluado_en', type: 'timestamptz', default: () => 'now()' })
  evaluadoEn!: Date;
}
