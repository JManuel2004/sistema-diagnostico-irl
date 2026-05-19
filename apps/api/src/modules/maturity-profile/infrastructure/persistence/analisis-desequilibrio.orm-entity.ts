import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'analisis_desequilibrio' })
export class AnalisisDesequilibrioOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_desequilibrio' })
  idDesequilibrio!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_par', type: 'integer' })
  idPar!: number;

  @Column({ name: 'diferencia_niveles', type: 'integer' })
  diferenciaNiveles!: number;

  @Column({ name: 'clasificacion', type: 'varchar', length: 16 })
  clasificacion!: string;
}
