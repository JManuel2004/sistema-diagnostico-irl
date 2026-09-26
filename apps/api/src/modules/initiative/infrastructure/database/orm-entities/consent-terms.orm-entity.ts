import { Column, Entity, PrimaryColumn } from 'typeorm';
import type { ConsentTermsSection } from '@innlab/contracts';

/** A published consent text (`irl_catalog.consent_terms`), read-only at runtime. */
@Entity({ schema: 'irl_catalog', name: 'consent_terms' })
export class ConsentTermsOrm {
  @PrimaryColumn({ name: 'version', type: 'varchar', length: 16 })
  version!: string;

  @Column({ name: 'title', type: 'varchar', length: 200 })
  title!: string;

  @Column({ name: 'sections', type: 'jsonb' })
  sections!: ConsentTermsSection[];

  @Column({ name: 'checkbox_label', type: 'varchar', length: 300 })
  checkboxLabel!: string;

  @Column({ name: 'published_at', type: 'timestamptz' })
  publishedAt!: Date;
}
