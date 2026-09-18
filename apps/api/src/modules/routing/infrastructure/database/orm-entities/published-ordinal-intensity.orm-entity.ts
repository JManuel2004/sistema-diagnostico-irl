import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * How strongly one service addresses one IRL dimension, stated as an
 * ordinal label.
 *
 * `label` deliberately carries no FK to `valor_etiqueta_calibracion`:
 * it is resolved against the calibration snapshot pinned by this row's
 * configuration version, not against the current one.
 */
@Entity({ schema: 'irl_catalog', name: 'published_ordinal_intensity' })
export class PublishedOrdinalIntensityOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_ordinal_profile', type: 'bigint' })
  idOrdinalProfile!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'label', type: 'varchar', length: 24 })
  label!: string;
}
