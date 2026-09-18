import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A published service profile: the IRL band it serves, the initiative
 * stages it fits, and — through `PublishedOrdinalIntensityOrm` — how
 * strongly it addresses each of the six dimensions.
 *
 * `relevantStages` is a comma-separated list of stage codes rather than
 * a child table. The stage catalogue is small and closed and the engine
 * only ever asks "does this stage belong to the set". Normalise it if the
 * catalogue grows or gains attributes of its own.
 */
@Entity({ schema: 'irl_catalog', name: 'published_ordinal_profile' })
export class PublishedOrdinalProfileOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  idOrdinalProfile!: string;

  @Column({ name: 'id_service', type: 'integer' })
  idService!: number;

  @Column({ name: 'min_level', type: 'integer' })
  minLevel!: number;

  @Column({ name: 'max_level', type: 'integer' })
  maxLevel!: number;

  @Column({ name: 'relevant_stages', type: 'varchar', length: 200 })
  relevantStages!: string;

  @Column({ name: 'profile_hash', type: 'varchar', length: 64 })
  profileHash!: string;
}
