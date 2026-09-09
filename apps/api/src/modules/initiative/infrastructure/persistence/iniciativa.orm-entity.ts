import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'iniciativa' })
export class IniciativaOrm {
  @PrimaryColumn({ name: 'id_iniciativa', type: 'uuid' })
  idIniciativa!: string;

  @Column({ name: 'id_diagnostico', type: 'uuid' })
  idDiagnostico!: string;

  @Column({ name: 'id_sector', type: 'bigint' })
  idSector!: string;

  @Column({ name: 'nombre', type: 'varchar', length: 200 })
  nombre!: string;

  @Column({ name: 'descripcion_breve', type: 'varchar', length: 1000 })
  descripcionBreve!: string;

  // ── Characterisation ────────────────────────────────────────────────
  //
  // Read by the portfolio routing engine, which scores a service partly on
  // how well it fits the initiative's situation rather than only its IRL
  // profile. All three are nullable because the initiative form (RF-04 /
  // HU-06) is not implemented, so nothing populates them yet. The engine
  // treats null as "does not match" for stage affinity and "does not
  // exclude" for eligibility, and says so in the trace.

  @Column({ name: 'id_etapa', type: 'bigint', nullable: true })
  idEtapa!: string | null;

  @Column({ name: 'tamano_equipo', type: 'integer', nullable: true })
  tamanoEquipo!: number | null;

  @Column({ name: 'vinculacion_academica', type: 'boolean', nullable: true })
  vinculacionAcademica!: boolean | null;
}
