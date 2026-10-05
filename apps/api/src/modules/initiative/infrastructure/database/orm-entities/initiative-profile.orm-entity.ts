import { Column, Entity, PrimaryColumn } from 'typeorm';

/** The snapshot of an initiative's profile for one diagnostic. */
@Entity({ schema: 'irl_diagnostic', name: 'initiative_profile' })
export class InitiativeProfileOrm {
  @PrimaryColumn({ name: 'id', type: 'uuid' })
  id!: string;

  @Column({ name: 'id_initiative', type: 'uuid' })
  idInitiative!: string;

  @Column({ name: 'id_diagnostic', type: 'uuid' })
  idDiagnostic!: string;

  @Column({ name: 'id_sector', type: 'bigint' })
  idSector!: string;

  @Column({ name: 'name', type: 'varchar', length: 200 })
  name!: string;

  @Column({ name: 'product_type', type: 'varchar', length: 500 })
  productType!: string;

  @Column({ name: 'declared_stage', type: 'varchar', length: 500 })
  declaredStage!: string;

  @Column({ name: 'team_description', type: 'varchar', length: 500 })
  teamDescription!: string;

  @Column({ name: 'target_market', type: 'varchar', length: 500 })
  targetMarket!: string;

  @Column({ name: 'current_funding', type: 'varchar', length: 500 })
  currentFunding!: string;

  // ── Characterisation ────────────────────────────────────────────────
  //
  // Read by the portfolio routing engine, which scores a service partly on
  // how well it fits the initiative's situation rather than only its IRL
  // profile. All three are mandatory, like the rest of the profile.

  @Column({ name: 'id_stage', type: 'bigint' })
  idStage!: string;

  @Column({ name: 'team_size', type: 'integer' })
  teamSize!: number;

  @Column({ name: 'recorded_at', type: 'timestamptz', default: () => 'now()' })
  recordedAt!: Date;
}
