import {
  Column,
  Entity,
  JoinColumn,
  ManyToOne,
  PrimaryColumn,
  type Relation,
} from 'typeorm';
import { DimensionOrm } from './dimension.orm-entity.js';

/**
 * ORM entity for `irl_catalog.afirmacion` — the 48 statements
 * (8 per dimension).
 *
 * The FK column `id_dimension` is also exposed as a scalar property so
 * repositories that want only the id (without joining) can read it
 * without forcing the relation to load.
 */
@Entity({ schema: 'irl_catalog', name: 'afirmacion' })
export class AfirmacionOrm {
  @PrimaryColumn({ name: 'id_afirmacion', type: 'uuid' })
  idAfirmacion!: string;

  @Column({ name: 'id_dimension', type: 'uuid' })
  idDimension!: string;

  @Column({ name: 'orden', type: 'smallint' })
  orden!: number;

  @Column({ name: 'texto', type: 'text' })
  texto!: string;

  @Column({ name: 'version_marco', type: 'text', default: 'KTH-IRL-1.0' })
  versionMarco!: string;

  @Column({
    name: 'creado_en',
    type: 'timestamptz',
    default: () => 'now()',
  })
  creadoEn!: Date;

  @ManyToOne(() => DimensionOrm, (d) => d.afirmaciones, {
    onDelete: 'RESTRICT',
  })
  @JoinColumn({ name: 'id_dimension' })
  dimension!: Relation<DimensionOrm>;
}
