import { Column, Entity, PrimaryGeneratedColumn } from 'typeorm';

/** A hard filter. Layer 1: a service either qualifies or it does not. */
@Entity({ schema: 'irl_catalog', name: 'regla_elegibilidad_publicada' })
export class ReglaElegibilidadPublicadaOrm {
  @PrimaryGeneratedColumn({ type: 'bigint', name: 'id_regla_elig_publicada' })
  idReglaEligPublicada!: string;

  @Column({ name: 'id_version_configuracion', type: 'bigint' })
  idVersionConfiguracion!: string;

  @Column({ name: 'id_servicio', type: 'integer' })
  idServicio!: number;

  @Column({ name: 'predicado', type: 'jsonb' })
  predicado!: unknown;

  @Column({ name: 'arbol_expresion', type: 'jsonb' })
  arbolExpresion!: unknown;

  @Column({ name: 'mensaje_exclusion', type: 'varchar', length: 500 })
  mensajeExclusion!: string;

  @Column({ name: 'hash_regla', type: 'varchar', length: 64 })
  hashRegla!: string;
}
