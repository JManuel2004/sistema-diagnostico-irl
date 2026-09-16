import { Column, Entity, Index, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'answer' })
@Index('uq_answer_diagnostic_statement', ['idDiagnostico', 'idStatement'], {
  unique: true,
})
export class AnswerOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Index('ix_answer_diagnostic')
  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_statement', type: 'bigint' })
  idStatement!: string;

  @Column({ name: 'likert_value', type: 'integer' })
  likertValue!: number;

  @Column({
    name: 'answered_at',
    type: 'timestamptz',
    default: () => 'now()',
  })
  answeredAt!: Date;
}
