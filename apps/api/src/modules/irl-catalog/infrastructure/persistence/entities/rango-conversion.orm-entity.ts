import { Column, Entity, PrimaryColumn } from 'typeorm';

const numericTransformer = {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  },
  from(value: string | null | undefined): number | null | undefined {
    return value === null || value === undefined ? value : Number(value);
  },
};

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
