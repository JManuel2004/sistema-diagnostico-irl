import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'answer' })
@Index('uq_answer_diagnostic_statement', ['diagnosticId', 'idStatement'], {
  unique: true,
})
export class AnswerOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Index('ix_answer_diagnostic')
  @Column({ name: 'id_diagnostic', type: 'uuid' })
  diagnosticId!: string;

  @Column({ name: 'id_statement', type: 'bigint' })
  idStatement!: string;

  @Column({ name: 'likert_value', type: 'integer' })
  likertValue!: number;

  @Column({ name: 'justification', type: 'varchar', length: 1000 })
  justification!: string;

  @Column({
    name: 'answered_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  answeredAt!: Date;
}
