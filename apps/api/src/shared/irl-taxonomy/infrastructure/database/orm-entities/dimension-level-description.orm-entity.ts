import { Column, Entity, PrimaryColumn } from 'typeorm';

/** What a level of one dimension means, for one framework version. */
@Entity({ schema: 'irl_catalog', name: 'dimension_level_description' })
export class DimensionLevelDescriptionOrm {
  @PrimaryColumn({ name: 'id_framework_version', type: 'smallint' })
  idFrameworkVersion!: number;

  @PrimaryColumn({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @PrimaryColumn({ name: 'irl_level', type: 'smallint' })
  irlLevel!: number;

  @Column({ name: 'description', type: 'varchar', length: 300 })
  description!: string;
}
