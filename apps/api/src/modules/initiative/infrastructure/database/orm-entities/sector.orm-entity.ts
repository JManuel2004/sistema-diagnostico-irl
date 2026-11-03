import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'sector' })
export class SectorOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  /** Section code of the classification (A..V); null for «Otro». */
  @Column({ name: 'code', type: 'varchar', length: 4, nullable: true })
  code!: string | null;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  /** Classification and version, e.g. `CIIU Rev. 5 A.C.`. */
  @Column({ name: 'classification', type: 'varchar', length: 40 })
  classification!: string;

  @Column({ name: 'is_other', type: 'boolean', default: false })
  isOther!: boolean;

  /** What the section groups, in a line; for «Otro», when to choose it. */
  @Column({ name: 'description', type: 'varchar', length: 160, default: '' })
  description!: string;

  /** Related words the registration form searches the sector by. */
  @Column({
    name: 'keywords',
    type: 'text',
    array: true,
    default: () => "'{}'",
  })
  keywords!: string[];

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
