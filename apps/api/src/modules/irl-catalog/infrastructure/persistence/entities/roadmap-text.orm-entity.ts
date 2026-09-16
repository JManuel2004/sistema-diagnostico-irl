import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

@Entity({ schema: 'irl_catalog', name: 'roadmap_text' })
export class RoadmapTextOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_roadmap_text' })
  idRoadmapText!: string;

  @Column({ name: 'id_dimension', type: 'integer' })
  idDimension!: number;

  @Column({ name: 'irl_level', type: 'integer' })
  irlLevel!: number;

  @Column({ name: 'guidance_text', type: 'varchar', length: 1000 })
  guidanceText!: string;
}
