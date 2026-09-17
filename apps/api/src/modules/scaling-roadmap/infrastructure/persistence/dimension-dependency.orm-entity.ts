import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One directed edge of the dependency graph: `source` enables `target`,
 * but only once `source` reaches `minimumRequiredLevel`.
 *
 * `isActive` lets an edge be switched off without being deleted, which
 * matters the day a configuration cycle exists. The engine reads only
 * the active ones.
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

  @Column({ name: 'is_active', type: 'boolean', default: true })
  isActive!: boolean;
}
