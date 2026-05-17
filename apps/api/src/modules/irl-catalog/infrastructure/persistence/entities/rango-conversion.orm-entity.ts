import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * `numeric(p,s)` round-trip transformer. TypeORM returns `numeric` as
 * `string` by default to preserve precision; we coerce to `number`
 * because the domain layer reasons about averages as numbers. Declared
 * before the entity so the decorator's `transformer` option captures a
 * fully-initialized value.
 */
const numericTransformer = {
  to(value: number | null | undefined): number | null | undefined {
    return value;
  },
  from(value: string | null | undefined): number | null | undefined {
    return value === null || value === undefined ? value : Number(value);
  },
};

/**
 * ORM entity for `irl_catalog.rango_conversion` — the nine rows of the
 * Likert-average → IRL-level conversion table (SA-06).
 *
 * The table is read-only at runtime; the seed `003-conversion-ranges`
 * loads the canonical bounds. `avg_min` and `avg_max` are `numeric(3,2)`
 * to preserve the 0.01 step of the framework's bands without floating
 * point drift.
 */
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

  @Column({ name: 'version_marco', type: 'text', default: 'KTH-IRL-1.0' })
  versionMarco!: string;
}
