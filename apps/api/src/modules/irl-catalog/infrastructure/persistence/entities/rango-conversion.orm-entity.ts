import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../../../../infrastructure/database/numeric.transformer.js';

@Entity({ schema: 'irl_catalog', name: 'rango_conversion' })
export class RangoConversionOrm {
  @PrimaryColumn({ name: 'nivel_irl', type: 'smallint' })
  nivelIrl!: number;

  @Column({
    name: 'avg_min',
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  avgMin!: number;

  @Column({
    name: 'avg_max',
    type: 'numeric',
    precision: 3,
    scale: 2,
    transformer: numericTransformer,
  })
  avgMax!: number;
}
