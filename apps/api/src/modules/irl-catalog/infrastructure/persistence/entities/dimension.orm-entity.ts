import {
  Column,
  Entity,
  OneToMany,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { AfirmacionOrm } from './afirmacion.orm-entity.js';

/**
 * ORM entity for `irl_catalog.dimension`.
 *
 * Column names use Spanish snake_case (bilingual rule). The TypeScript
 * property names use camelCase mapped to those columns; the application
 * layer reads domain objects via `Dimension.fromPersistence(orm)` and
 * never touches the ORM type directly.
 */
@Entity({ schema: 'irl_catalog', name: 'dimension' })
export class DimensionOrm {
  @PrimaryColumn({ name: 'id_dimension', type: 'uuid' })
  idDimension!: string;

  @Column({ name: 'codigo', type: 'text' })
  codigo!: string;

  @Column({ name: 'nombre', type: 'text' })
  nombre!: string;

  @Column({ name: 'descripcion', type: 'text' })
  descripcion!: string;

  @Column({ name: 'orden', type: 'smallint' })
  orden!: number;

  @Column({ name: 'version_marco', type: 'text', default: 'KTH-IRL-1.0' })
  versionMarco!: string;

  @Column({
    name: 'creado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creadoEn!: Date;

  @OneToMany(() => AfirmacionOrm, (afirmacion) => afirmacion.dimension)
  afirmaciones!: Relation<AfirmacionOrm[]>;
}
