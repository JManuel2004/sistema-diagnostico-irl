import { Column, Entity, PrimaryColumn } from 'typeorm';

/** One statement of a questionnaire draft (`irl_diagnostic.draft_answer`). */
@Entity({ schema: 'irl_diagnostic', name: 'draft_answer' })
export class DraftAnswerOrm {
  @PrimaryColumn({ name: 'id_diagnostic', type: 'uuid' })
  diagnosticId!: string;

  @PrimaryColumn({ name: 'id_statement', type: 'bigint' })
  idStatement!: string;

  @Column({ name: 'likert_value', type: 'integer', nullable: true })
  likertValue!: number | null;

  @Column({
    name: 'justification',
    type: 'varchar',
    length: 1000,
    nullable: true,
  })
  justification!: string | null;

  @Column({ name: 'updated_at', type: 'timestamptz', default: () => 'now()' })
  updatedAt!: Date;
}
