import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'par_dimension' })
export class ParDimensionOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_par' })
  idPar!: number;

  @Column({ name: 'id_dimension_a', type: 'integer' })
  idDimensionA!: number;

  @Column({ name: 'id_dimension_b', type: 'integer' })
  idDimensionB!: number;

  @Column({ name: 'codigo_par', type: 'varchar', length: 16 })
  codigoPar!: string;
}
