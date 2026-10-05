import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';
import type { DimensionCode } from '@innlab/contracts';
import type { RoadmapPhase } from '../../../domain/entities/scaling-roadmap.aggregate.js';

/**
 * The saved roadmap of a diagnostic: one row, `phases` as a snapshot of the
 * aggregate's phases (dimension codes, levels, the explanation fields, and
 * each phase's service with its trace), and the profile projected to the
 * end of the route. Dimension names and service cards are not stored; they
 * are read from the catalogs.
 */
@Entity({ schema: 'irl_diagnostic', name: 'scaling_roadmap' })
export class ScalingRoadmapOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id' })
  id!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'phases', type: 'jsonb' })
  phases!: RoadmapPhase[];

  @Column({ name: 'final_levels', type: 'jsonb' })
  finalLevels!: Record<DimensionCode, number>;

  @Column({ name: 'balanced', type: 'boolean' })
  balanced!: boolean;

  @Column({ name: 'generated_at', type: 'timestamptz' })
  generatedAt!: Date;
}
