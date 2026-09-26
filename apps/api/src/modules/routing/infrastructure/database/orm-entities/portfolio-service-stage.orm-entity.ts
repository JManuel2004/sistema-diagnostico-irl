import { Entity, PrimaryColumn } from 'typeorm';

/** A stage of the initiative a service fits (stage affinity of the engine). */
@Entity({ schema: 'irl_catalog', name: 'portfolio_service_stage' })
export class PortfolioServiceStageOrm {
  @PrimaryColumn({ name: 'id_service', type: 'integer' })
  idService!: number;

  @PrimaryColumn({ name: 'id_stage', type: 'bigint' })
  idStage!: string;
}
