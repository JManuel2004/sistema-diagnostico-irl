import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'texto_roadmap' })
export class TextoRoadmapOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_texto_roadmap' })
  idTextoRoadmap!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'nivel_irl', type: 'integer' })
  nivelIrl!: number;

  @Column({ name: 'texto_orientacion', type: 'varchar', length: 1000 })
  textoOrientacion!: string;
}
