import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DimensionOrm } from './dimension.orm-entity.js';

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

  @ManyToOne(() => DimensionOrm, (d) => d.statements, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_dimension' })
  dimension!: Relation<DimensionOrm>;
}
