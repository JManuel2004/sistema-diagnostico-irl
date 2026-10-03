import { Column, Entity, PrimaryColumn } from 'typeorm';

/** What a global IRL level means, for one framework version. */
@Entity({ schema: 'irl_catalog', name: 'global_level_description' })
export class GlobalLevelDescriptionOrm {
  @PrimaryColumn({ name: 'id_framework_version', type: 'smallint' })
  idFrameworkVersion!: number;

  @PrimaryColumn({ name: 'irl_level', type: 'smallint' })
  irlLevel!: number;

  @Column({ name: 'description', type: 'varchar', length: 300 })
  description!: string;
}
