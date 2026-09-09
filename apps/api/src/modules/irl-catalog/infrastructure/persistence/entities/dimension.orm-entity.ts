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

  /**
   * Nivel IRL que se espera que esta dimensión alcance para considerar
   * equilibrada la iniciativa. Insumo del roadmap de escalamiento
   * (RF-14): una dimensión por debajo de su mínimo entra al foco.
   *
   * La columna lleva `DEFAULT 4` en la base solo para que la migración
   * pudiera aplicarse sobre las seis filas ya sembradas; el valor real
   * lo fija el seed en las seis.
   */
  @Column({ name: 'nivel_minimo_esperado', type: 'smallint', default: 4 })
  nivelMinimoEsperado!: number;

  @OneToMany(() => AfirmacionOrm, (a) => a.dimension)
  afirmaciones!: Relation<AfirmacionOrm[]>;
}
