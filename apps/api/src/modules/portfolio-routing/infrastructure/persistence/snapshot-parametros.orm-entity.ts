import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * The global weights of the affinity score, frozen at publish time.
 *
 * `umbralMinimo` is the cutoff below which a candidate is not offered at
 * all; `nAlternativas` is how many runners-up accompany the principal
 * recommendation.
 */
@Entity({ schema: 'irl_catalog', name: 'snapshot_parametros' })
export class SnapshotParametrosOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_snapshot_parametros' })
  idSnapshotParametros!: string;

  @Column({ name: 'numero', type: 'integer' })
  numero!: number;

  @Column({ name: 'autor_id', type: 'varchar', length: 64 })
  autorId!: string;

  @Column({ name: 'comentario', type: 'varchar', length: 500, nullable: true })
  comentario!: string | null;

  @Column({ name: 'peso_cuello_botella', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  pesoCuelloBotella!: number;

  @Column({ name: 'peso_brecha', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  pesoBrecha!: number;

  @Column({ name: 'peso_desequilibrio_moderado', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  pesoDesequilibrioModerado!: number;

  @Column({ name: 'peso_desequilibrio_critico', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  pesoDesequilibrioCritico!: number;

  @Column({ name: 'peso_afinidad_etapa', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  pesoAfinidadEtapa!: number;

  @Column({ name: 'penalizacion_fuera_rango', type: 'numeric', precision: 4, scale: 2, transformer: numericTransformer })
  penalizacionFueraRango!: number;

  @Column({ name: 'umbral_minimo', type: 'numeric', precision: 5, scale: 2, transformer: numericTransformer })
  umbralMinimo!: number;

  @Column({ name: 'n_alternativas', type: 'integer' })
  nAlternativas!: number;

  @Column({ name: 'estado', type: 'varchar', length: 16 })
  estado!: string;

  @Column({ name: 'creado_en', type: 'timestamptz', default: () => 'now()' })
  creadoEn!: Date;
}
