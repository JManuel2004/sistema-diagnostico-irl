import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'dimension_pair' })
export class DimensionPairOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_pair' })
  idPair!: number;

  @Column({ name: 'id_dimension_a', type: 'integer' })
  idDimensionA!: number;

  @Column({ name: 'id_dimension_b', type: 'integer' })
  idDimensionB!: number;

  @Column({ name: 'pair_code', type: 'varchar', length: 16 })
  pairCode!: string;
}
