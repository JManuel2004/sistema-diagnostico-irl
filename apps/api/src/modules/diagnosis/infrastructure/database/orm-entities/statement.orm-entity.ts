import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A questionnaire statement. `id_dimension` is kept as a plain column, with
 * no ORM relation to `shared/irl-taxonomy/`'s `DimensionOrm`: the dimension's
 * code and order are read through `TAXONOMY_REPOSITORY`, so no ORM entity
 * crosses the module boundary.
 */

@Entity({ schema: 'irl_catalog', name: 'statement' })
export class StatementOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_statement' })
  idStatement!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'sequence', type: 'integer' })
  sequence!: number;

  @Column({ name: 'text_es', type: 'varchar', length: 500 })
  textEs!: string;
}
