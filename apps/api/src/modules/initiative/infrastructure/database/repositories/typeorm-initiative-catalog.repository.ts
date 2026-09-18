import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type {
  InitiativeCatalogPort,
  SectorCatalogEntry,
  InitiativeStageCatalogEntry,
} from '../../../domain/repositories/initiative-catalog.port.js';
import { SectorOrm } from '../orm-entities/sector.orm-entity.js';
import { InitiativeStageOrm } from '../orm-entities/initiative-stage.orm-entity.js';

@Injectable()
export class TypeOrmInitiativeCatalogRepository implements InitiativeCatalogPort {
  constructor(
    @InjectRepository(SectorOrm)
    private readonly sectors: Repository<SectorOrm>,
    @InjectRepository(InitiativeStageOrm)
    private readonly stages: Repository<InitiativeStageOrm>,
  ) {}

  async findAllSectors(): Promise<SectorCatalogEntry[]> {
    const rows = await this.sectors.find({
      where: { isActive: true },
      order: { name: 'ASC' },
    });
    return rows.map((r) => ({ id: r.id, name: r.name }));
  }

  async findSectorById(id: string): Promise<SectorCatalogEntry | null> {
    const row = await this.sectors.findOne({ where: { id } });
    return row ? { id: row.id, name: row.name } : null;
  }

  async findAllStages(): Promise<InitiativeStageCatalogEntry[]> {
    const rows = await this.stages.find({
      where: { isActive: true },
      order: { sequence: 'ASC' },
    });
    return rows.map((r) => ({
      id: r.id,
      code: r.code,
      name: r.name,
      sequence: r.sequence,
    }));
  }

  async findStageById(id: string): Promise<InitiativeStageCatalogEntry | null> {
    const row = await this.stages.findOne({ where: { id } });
    return row
      ? { id: row.id, code: row.code, name: row.name, sequence: row.sequence }
      : null;
  }

  async findStageByCode(
    code: string,
  ): Promise<InitiativeStageCatalogEntry | null> {
    const row = await this.stages.findOne({ where: { code } });
    return row
      ? { id: row.id, code: row.code, name: row.name, sequence: row.sequence }
      : null;
  }
}
