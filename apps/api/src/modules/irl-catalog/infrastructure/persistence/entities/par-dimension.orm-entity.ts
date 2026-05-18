import { Column, Entity, PrimaryColumn } from 'typeorm';

/**
 * ORM entity for `irl_catalog.par_dimension` — the six dimension pairs
 * evaluated for imbalance (RF-10).
 *
 * The 6 canonical pairs are seeded by `004-dimension-pairs.seed.ts`:
 * TRL-CRL, TRL-BRL, CRL-BRL, TmRL-FRL, BRL-IPRL, TRL-IPRL.
 */
@Entity({ schema: 'irl_catalog', name: 'par_dimension' })
export class ParDimensionOrm {
  @PrimaryColumn({ name: 'id_par', type: 'uuid' })
  idPar!: string;

  @Column({ name: 'codigo_izq', type: 'text' })
  codigoIzq!: string;

  @Column({ name: 'codigo_der', type: 'text' })
  codigoDer!: string;

  @Column({ name: 'version_marco', type: 'text', default: 'KTH-IRL-1.0' })
  versionMarco!: string;
}
