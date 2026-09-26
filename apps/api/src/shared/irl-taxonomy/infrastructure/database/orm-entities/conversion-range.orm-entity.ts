import { Column, Entity, PrimaryColumn } from 'typeorm';
import { numericTransformer } from '../../../../kernel/infrastructure/database/numeric.transformer.js';

/** A range of the conversion table of one framework version. */
@Entity({ schema: 'irl_catalog', name: 'conversion_range' })
export class ConversionRangeOrm {
  @PrimaryColumn({ name: 'id_framework_version', type: 'smallint' })
  idFrameworkVersion!: number;

  @PrimaryColumn({ name: 'irl_level', type: 'smallint' })
  irlLevel!: number;

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
