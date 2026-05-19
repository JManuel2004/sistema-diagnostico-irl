import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'recomendacion_portafolio' })
export class RecomendacionPortafolioOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_recomendacion' })
  idRecomendacion!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_regla', type: 'bigint' })
  idRegla!: string;

  @Column({ name: 'servicio_snapshot', type: 'varchar', length: 80 })
  servicioSnapshot!: string;

  @Column({ name: 'justificacion_criterio', type: 'varchar', length: 1000 })
  justificacionCriterio!: string;

  @Column({ name: 'fecha_generacion', type: 'timestamptz' })
  fechaGeneracion!: Date;
}
