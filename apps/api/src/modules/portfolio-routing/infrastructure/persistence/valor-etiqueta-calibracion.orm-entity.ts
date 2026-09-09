import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * One rung of the ordinal scale: the label the business side reads, and
 * the number the scorer multiplies. `ordenMonotonia` makes the
 * "principal > secundario > marginal > no_aplica" check deterministic.
 */
@Entity({ schema: 'irl_catalog', name: 'valor_etiqueta_calibracion' })
export class ValorEtiquetaCalibracionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_valor_etiqueta' })
  idValorEtiqueta!: string;

  @Column({ name: 'id_snapshot_calibracion', type: 'bigint' })
  idSnapshotCalibracion!: string;

  @Column({ name: 'etiqueta', type: 'varchar', length: 24 })
  etiqueta!: string;

  @Column({
    name: 'valor_numerico',
    type: 'numeric',
    precision: 4,
    scale: 2,
    transformer: numericTransformer,
  })
  valorNumerico!: number;

  @Column({ name: 'orden_monotonia', type: 'integer' })
  ordenMonotonia!: number;
}
