import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { StatementOrm } from '../../../../../modules/diagnosis/infrastructure/database/orm-entities/statement.orm-entity.js';

@Entity({ schema: 'irl_catalog', name: 'dimension' })
export class DimensionOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_dimension' })
  idDimension!: number;

  @Column({ name: 'code', type: 'varchar', length: 8 })
  code!: string;

  @Column({ name: 'name_es', type: 'varchar', length: 80 })
  nameEs!: string;

  @Column({ name: 'name_en', type: 'varchar', length: 80 })
  nameEn!: string;

  /** Short Spanish label for compact UI (chart axes, cards, roadmap lines). */
  @Column({ name: 'short_name_es', type: 'varchar', length: 40 })
  shortNameEs!: string;

  @Column({ name: 'description', type: 'varchar', length: 500 })
  description!: string;

  @Column({ name: 'is_critical_dimension', type: 'boolean', default: false })
  isCriticalDimension!: boolean;

  @Column({ name: 'sequence', type: 'integer' })
  sequence!: number;

  /**
   * IRL level the dimension is expected to reach for the initiative to
   * be considered balanced. Input to the scaling roadmap (RF-14): a
   * dimension below its minimum enters the focus set.
   *
   * The column carries `DEFAULT 4` in the database only so the
   * migration could apply over the six already-seeded rows; the real
   * value is set by the seed for all six.
   */
  @Column({ name: 'minimum_expected_level', type: 'smallint', default: 4 })
  minimumExpectedLevel!: number;

  @OneToMany(() => StatementOrm, (s) => s.dimension)
  statements!: Relation<StatementOrm[]>;
}
