import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * How strongly one service addresses one IRL dimension, stated as an
 * ordinal label.
 *
 * `etiqueta` deliberately carries no FK to `valor_etiqueta_calibracion`:
 * it is resolved against the calibration snapshot pinned by this row's
 * configuration version, not against the current one.
 */
@Entity({ schema: 'irl_catalog', name: 'intensidad_ordinal_publicada' })
export class IntensidadOrdinalPublicadaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_intensidad_publicada' })
  idIntensidadPublicada!: string;

  @Column({ name: 'id_ficha_publicada', type: 'bigint' })
  idFichaPublicada!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'etiqueta', type: 'varchar', length: 24 })
  etiqueta!: string;
}
