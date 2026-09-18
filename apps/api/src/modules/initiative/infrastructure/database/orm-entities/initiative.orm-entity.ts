import { Column, Entity, PrimaryColumn } from 'typeorm';

@Entity({ schema: 'irl_diagnostic', name: 'initiative' })
export class InitiativeOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'id_sector', type: 'bigint' })
  idSector!: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'short_description', type: 'varchar', length: 1000 })
  shortDescription!: string;

  // ── Characterisation ────────────────────────────────────────────────
  //
  // Read by the portfolio routing engine, which scores a service partly on
  // how well it fits the initiative's situation rather than only its IRL
  // profile. All three are nullable: registering an initiative and
  // characterising it are two different moments in the flow, and nothing
  // requires the second to happen before the first.

  @Column({ name: 'id_stage', type: 'bigint', nullable: true })
  idStage!: string | null;

  @Column({ name: 'team_size', type: 'integer', nullable: true })
  teamSize!: number | null;

  @Column({ name: 'academic_linkage', type: 'boolean', nullable: true })
  academicLinkage!: boolean | null;
}
