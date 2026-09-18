import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One directed edge of the dependency graph: `source` enables `target`,
 * but only once `source` reaches `minimumRequiredLevel`.
 *
 * Used to also carry `isActive`, letting an edge be switched off without
 * being deleted — a mechanism built for a configuration cycle that has
 * no actor to operate it. Retired (backlog 5.6): every edge has stayed
 * active since the seed, and nothing in the system can toggle one.
 *
 * Read-only at runtime. Edges ship through seeds, like every other
 * `irl_catalog` table.
 */
@Entity({ schema: 'irl_catalog', name: 'dimension_dependency' })
export class DimensionDependencyOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id' })
  id!: number;

  @Column({ name: 'id_dimension_source', type: 'integer' })
  idDimensionSource!: number;

  @Column({ name: 'id_dimension_target', type: 'integer' })
  idDimensionTarget!: number;

  @Column({ name: 'minimum_required_level', type: 'smallint' })
  minimumRequiredLevel!: number;
}
