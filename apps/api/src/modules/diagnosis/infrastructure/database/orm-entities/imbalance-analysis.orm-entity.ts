import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'imbalance_analysis' })
export class ImbalanceAnalysisOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_pair', type: 'integer' })
  idPair!: number;

  @Column({ name: 'level_difference', type: 'integer' })
  levelDifference!: number;

  @Column({ name: 'classification', type: 'varchar', length: 16 })
  classification!: string;
}
