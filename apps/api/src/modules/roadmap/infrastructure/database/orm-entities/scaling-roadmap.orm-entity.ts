import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { RoadmapPhase } from '../../../domain/entities/scaling-roadmap.aggregate.js';

/**
 * The saved roadmap of a diagnostic: one row, `phases` as a snapshot of the
 * aggregate's phases (dimension codes, levels and the explanation fields).
 * Dimension names are not stored; they are read from the catalog.
 */
@Entity({ schema: 'irl_diagnostic', name: 'scaling_roadmap' })
export class ScalingRoadmapOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'phases', type: 'jsonb' })
  phases!: RoadmapPhase[];

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
