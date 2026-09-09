import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * One directed edge of the dependency graph: `origen` enables `destino`,
 * but only once `origen` reaches `nivelMinimoRequerido`.
 *
 * `activa` mirrors `servicio_portafolio.activo` and
 * `regla_enrutamiento.activa`: an edge can be switched off without being
 * deleted, which matters the day a configuration cycle exists. The engine
 * reads only the active ones.
 *
 * Read-only at runtime. Edges ship through seeds, like every other
 * `irl_catalog` table.
 */
@Entity({ schema: 'irl_catalog', name: 'dependencia_dimension' })
export class DependenciaDimensionOrm {
  @PrimaryGeneratedColumn({ type: 'integer', name: 'id_dependencia' })
  idDependencia!: number;

  @Column({ name: 'id_dimension_origen', type: 'integer' })
  idDimensionOrigen!: number;

  @Column({ name: 'id_dimension_destino', type: 'integer' })
  idDimensionDestino!: number;

  @Column({ name: 'nivel_minimo_requerido', type: 'smallint' })
  nivelMinimoRequerido!: number;

  @Column({ name: 'activa', type: 'boolean', default: true })
  activa!: boolean;
}
