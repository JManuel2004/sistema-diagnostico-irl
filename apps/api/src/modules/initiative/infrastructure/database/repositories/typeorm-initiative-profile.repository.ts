import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { InitiativeProfileRepositoryPort } from '../../../domain/repositories/initiative-profile.repository.port.js';
import { InitiativeProfile } from '../../../domain/entities/initiative-profile.aggregate.js';
import { InitiativeProfileOrm } from '../orm-entities/initiative-profile.orm-entity.js';

@Injectable()
export class TypeOrmInitiativeProfileRepository implements InitiativeProfileRepositoryPort {
  constructor(
    @InjectRepository(InitiativeProfileOrm)
    private readonly orm: Repository<InitiativeProfileOrm>,
  ) {}

  async findByDiagnosticId(
    diagnosticId: string,
  ): Promise<InitiativeProfile | null> {
    const row = await this.orm.findOne({
      where: { idDiagnostic: diagnosticId },
    });
    return row ? this.toDomain(row) : null;
  }

  async findLatestByInitiativeId(
    initiativeId: string,
  ): Promise<InitiativeProfile | null> {
    const [row] = await this.orm.find({
      where: { idInitiative: initiativeId },
      order: { recordedAt: 'DESC' },
      take: 1,
    });
    return row ? this.toDomain(row) : null;
  }

  /**
   * One statement upsert keyed by `id_diagnostic`
   * (`uq_initiative_profile_diagnostic`): registering the profile of the
   * same diagnostic again replaces its snapshot, and two simultaneous first
   * registrations cannot both insert.
   */
  async save(profile: InitiativeProfile): Promise<void> {
    const s = profile.toPersistence();
    await this.orm
      .createQueryBuilder()
      .insert()
      .into(InitiativeProfileOrm)
      .values({
        id: s.id,
        idInitiative: s.initiativeId,
        idDiagnostic: s.diagnosticId,
        idSector: s.sectorId,
        name: s.name,
        productType: s.productType,
        idStage: s.stageId,
        declaredStage: s.declaredStage,
        teamSize: s.teamSize,
        teamDescription: s.teamDescription,
        targetMarket: s.targetMarket,
        currentFunding: s.currentFunding,
        recordedAt: s.recordedAt,
      })
      .orUpdate(
        [
          'id_initiative',
          'id_sector',
          'name',
          'product_type',
          'id_stage',
          'declared_stage',
          'team_size',
          'team_description',
          'target_market',
          'current_funding',
          'recorded_at',
        ],
        ['id_diagnostic'],
      )
      .execute();
  }

  private toDomain(row: InitiativeProfileOrm): InitiativeProfile {
    return InitiativeProfile.fromPersistence({
      id: row.id,
      initiativeId: row.idInitiative,
      diagnosticId: row.idDiagnostic,
      sectorId: row.idSector,
      name: row.name,
      productType: row.productType,
      declaredStage: row.declaredStage,
      teamDescription: row.teamDescription,
      targetMarket: row.targetMarket,
      currentFunding: row.currentFunding,
      stageId: row.idStage,
      teamSize: row.teamSize,
      recordedAt: row.recordedAt,
    });
  }
}
