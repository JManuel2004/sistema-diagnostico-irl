import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { InitiativeRepositoryPort } from '../../../domain/repositories/initiative.repository.port.js';
import { Initiative } from '../../../domain/entities/initiative.aggregate.js';
import { InitiativeOrm } from '../orm-entities/initiative.orm-entity.js';

@Injectable()
export class TypeOrmInitiativeRepository implements InitiativeRepositoryPort {
  constructor(
    @InjectRepository(InitiativeOrm)
    private readonly orm: Repository<InitiativeOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<Initiative | null> {
    const row = await this.orm.findOne({ where: { idDiagnostic: diagnosticId } });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Upsert keyed by `diagnosticId` (`uq_initiative_diagnostic`), not by
   * `id` — a second `register()` for the same diagnostic replaces the
   * row instead of colliding on the unique constraint.
   */
  async save(initiative: Initiative): Promise<void> {
    const snapshot = initiative.toPersistence();
    const existing = await this.orm.findOne({
      where: { idDiagnostic: snapshot.diagnosticId },
    });

    await this.orm.save(
      this.orm.create({
        id: existing?.id ?? snapshot.id,
        idDiagnostic: snapshot.diagnosticId,
        idSector: snapshot.sectorId,
        name: snapshot.name,
        shortDescription: snapshot.shortDescription,
        idStage: snapshot.stageId,
        teamSize: snapshot.teamSize,
        academicLinkage: snapshot.academicLinkage,
      }),
    );
  }

  private toDomain(row: InitiativeOrm): Initiative {
    return Initiative.fromPersistence({
      id: row.id,
      diagnosticId: row.idDiagnostic,
      sectorId: row.idSector,
      name: row.name,
      shortDescription: row.shortDescription,
      stageId: row.idStage,
      teamSize: row.teamSize,
      academicLinkage: row.academicLinkage,
    });
  }
}
