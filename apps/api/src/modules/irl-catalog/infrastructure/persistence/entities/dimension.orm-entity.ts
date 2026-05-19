import {
  Column,
  Entity,
  OneToMany,
  PrimaryGeneratedColumn,
  type Relation,
} from 'typeorm';
import { AfirmacionOrm } from './afirmacion.orm-entity.js';

@Entity({ schema: 'irl_catalog', name: 'dimension' })
export class DimensionOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_dimension' })
  idDimension!: number;

  @Column({ name: 'codigo', type: 'varchar', length: 8 })
  codigo!: string;

  @Column({ name: 'nombre_es', type: 'varchar', length: 80 })
  nombreEs!: string;

  @Column({ name: 'nombre_en', type: 'varchar', length: 80 })
  nombreEn!: string;

  @Column({ name: 'descripcion', type: 'varchar', length: 500 })
  descripcion!: string;

  @Column({ name: 'es_dimension_critica', type: 'boolean', default: false })
  esDimensionCritica!: boolean;

  @Column({ name: 'orden', type: 'integer' })
  orden!: number;

  @OneToMany(() => AfirmacionOrm, (a) => a.dimension)
  afirmaciones!: Relation<AfirmacionOrm[]>;
}
