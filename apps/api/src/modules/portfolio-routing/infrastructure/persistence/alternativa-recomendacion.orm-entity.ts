import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import { numericTransformer } from '../../../../infrastructure/database/numeric.transformer.js';

/**
 * Positions 2..N of the ranking that accompany the principal
 * recommendation. `posicion >= 2` by CHECK: position 1 is the principal
 * service and lives on `recomendacion_portafolio` itself.
 */
@Entity({ schema: 'irl_diagnostic', name: 'alternativa_recomendacion' })
export class AlternativaRecomendacionOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_alternativa' })
  idAlternativa!: string;

  @Column({ name: 'id_recomendacion', type: 'bigint' })
  idRecomendacion!: string;

  @Column({ name: 'id_servicio', type: 'integer' })
  idServicio!: number;

  @Column({ name: 'servicio_snapshot', type: 'varchar', length: 80 })
  servicioSnapshot!: string;

  @Column({ name: 'posicion', type: 'integer' })
  posicion!: number;

  @Column({
    name: 'puntaje',
    type: 'numeric',
    precision: 6,
    scale: 3,
    transformer: numericTransformer,
  })
  puntaje!: number;
}
