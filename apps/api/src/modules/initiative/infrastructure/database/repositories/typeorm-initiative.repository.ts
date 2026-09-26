import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { InitiativeRepositoryPort } from '../../../domain/repositories/initiative.repository.port.js';
import { Initiative } from '../../../domain/entities/initiative.aggregate.js';
import type { Consent } from '../../../domain/entities/consent.entity.js';
import { InitiativeOrm } from '../orm-entities/initiative.orm-entity.js';
import { ConsentOrm } from '../orm-entities/consent.orm-entity.js';

@Injectable()
export class TypeOrmInitiativeRepository implements InitiativeRepositoryPort {
  constructor(
    @InjectRepository(InitiativeOrm)
    private readonly orm: Repository<InitiativeOrm>,
  ) {}

  async findById(id: string): Promise<Initiative | null> {
    const row = await this.orm.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findByOwner(ownerId: string): Promise<Initiative[]> {
    const rows = await this.orm.find({
      where: { cognitoUserId: ownerId },
      order: { createdAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async createWithConsent(initiative: Initiative, consent: Consent): Promise<void> {
    const i = initiative.toPersistence();
    const c = consent.toPersistence();
    await this.orm.manager.transaction(async (manager) => {
      await manager.insert(InitiativeOrm, {
        id: i.id,
        cognitoUserId: i.ownerId,
        createdAt: i.createdAt,
      });
      await manager.insert(ConsentOrm, {
        id: c.id,
        idInitiative: c.initiativeId,
        cognitoUserId: c.cognitoUserId,
        termsVersion: c.termsVersion,
        acceptedAt: c.acceptedAt,
      });
    });
  }

  private toDomain(row: InitiativeOrm): Initiative {
    return Initiative.fromPersistence({
      id: row.id,
      ownerId: row.cognitoUserId,
      createdAt: row.createdAt,
    });
  }
}
