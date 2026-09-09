import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/**
 * A deliberate override of the computed ranking. Layer 3.
 *
 * `codigo` is the stable business identifier (E-01, E-02, ...) used when
 * attributing an outcome to the adjustment that caused it — a synthetic
 * primary key would not survive a republish.
 *
 * `prioridadOrden` is unique within a version, so application order is
 * total and deterministic.
 */
@Entity({ schema: 'irl_catalog', name: 'regla_excepcion_publicada' })
export class ReglaExcepcionPublicadaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_regla_exc_publicada' })
  idReglaExcPublicada!: string;

  @Column({ name: 'id_version_configuracion', type: 'bigint' })
  idVersionConfiguracion!: string;

  @Column({ name: 'codigo', type: 'varchar', length: 16 })
  codigo!: string;

  @Column({ name: 'predicado', type: 'jsonb' })
  predicado!: unknown;

  @Column({ name: 'arbol_expresion', type: 'jsonb' })
  arbolExpresion!: unknown;

  @Column({ name: 'accion', type: 'varchar', length: 16 })
  accion!: string;

  @Column({ name: 'id_servicio_objetivo', type: 'integer' })
  idServicioObjetivo!: number;

  @Column({ name: 'posiciones', type: 'integer', nullable: true })
  posiciones!: number | null;

  @Column({ name: 'motivo_declarado', type: 'varchar', length: 1000 })
  motivoDeclarado!: string;

  @Column({ name: 'prioridad_orden', type: 'integer' })
  prioridadOrden!: number;

  @Column({ name: 'hash_regla', type: 'varchar', length: 64 })
  hashRegla!: string;
}
