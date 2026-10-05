import { Column, Entity, PrimaryColumn } from 'typeorm';

/** How the roadmap paces and closes the route (single row, `id = 1`). */
@Entity({ schema: 'irl_catalog', name: 'roadmap_parameters' })
export class RoadmapParametersOrm {
  @PrimaryColumn({ name: 'id', type: 'smallint' })
  id!: number;

  @Column({ name: 'max_levels_per_phase', type: 'smallint' })
  maxLevelsPerPhase!: number;

  @Column({ name: 'balance_tolerance', type: 'smallint' })
  balanceTolerance!: number;
}
