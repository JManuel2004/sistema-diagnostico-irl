import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A published version of the framework content (`irl_catalog.framework_version`). */
@Entity({ schema: 'irl_catalog', name: 'framework_version' })
export class FrameworkVersionOrm {
  @PrimaryGeneratedColumn({ type: 'smallint', name: 'id' })
  id!: number;

  @Column({ name: 'code', type: 'varchar', length: 16 })
  code!: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt!: Date;
}
