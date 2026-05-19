import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { DimensionOrm } from './dimension.orm-entity.js';

@Entity({ schema: 'irl_catalog', name: 'afirmacion' })
export class AfirmacionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_afirmacion' })
  idAfirmacion!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'numero_en_dimension', type: 'integer' })
  numeroEnDimension!: number;

  @Column({ name: 'texto_es', type: 'varchar', length: 500 })
  textoEs!: string;

  @ManyToOne(() => DimensionOrm, (d) => d.afirmaciones, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_dimension' })
  dimension!: Relation<DimensionOrm>;
}
