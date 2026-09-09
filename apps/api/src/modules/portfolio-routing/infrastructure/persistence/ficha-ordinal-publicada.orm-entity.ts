import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A published service profile: the IRL band it serves, the initiative
 * stages it fits, and — through `IntensidadOrdinalPublicadaOrm` — how
 * strongly it addresses each of the six dimensions.
 *
 * `etapasPertinentes` is a comma-separated list of stage codes rather than
 * a child table. The stage catalogue is small and closed and the engine
 * only ever asks "does this stage belong to the set". Normalise it if the
 * catalogue grows or gains attributes of its own.
 */
@Entity({ schema: 'irl_catalog', name: 'ficha_ordinal_publicada' })
export class FichaOrdinalPublicadaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_ficha_publicada' })
  idFichaPublicada!: string;

  @Column({ name: 'id_version_configuracion', type: 'bigint' })
  idVersionConfiguracion!: string;

  @Column({ name: 'id_servicio', type: 'integer' })
  idServicio!: number;

  @Column({ name: 'nivel_min', type: 'integer' })
  nivelMin!: number;

  @Column({ name: 'nivel_max', type: 'integer' })
  nivelMax!: number;

  @Column({ name: 'etapas_pertinentes', type: 'varchar', length: 200 })
  etapasPertinentes!: string;

  @Column({ name: 'hash_ficha', type: 'varchar', length: 64 })
  hashFicha!: string;
}
