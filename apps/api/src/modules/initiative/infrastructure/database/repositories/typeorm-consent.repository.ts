import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { ConsentRepositoryPort } from '../../../domain/repositories/consent.repository.port.js';
import { Consent } from '../../../domain/entities/consent.entity.js';
import { ConsentOrm } from '../orm-entities/consent.orm-entity.js';

@Injectable()
export class TypeOrmConsentRepository implements ConsentRepositoryPort {
  constructor(
    @InjectRepository(ConsentOrm)
    private readonly orm: Repository<ConsentOrm>,
  ) {}

  async findLatestByInitiativeId(initiativeId: string): Promise<Consent | null> {
    const [row] = await this.orm.find({
      where: { idInitiative: initiativeId },
      order: { acceptedAt: 'DESC' },
      take: 1,
    });
    return row ? this.toDomain(row) : null;
  }

  /** Insert only: an acceptance never replaces an earlier one. */
  async add(consent: Consent): Promise<void> {
    const c = consent.toPersistence();
    await this.orm.insert({
      id: c.id,
      idInitiative: c.initiativeId,
      cognitoUserId: c.cognitoUserId,
      termsVersion: c.termsVersion,
      acceptedAt: c.acceptedAt,
    });
  }

  private toDomain(row: ConsentOrm): Consent {
    return Consent.fromPersistence({
      id: row.id,
      initiativeId: row.idInitiative,
      cognitoUserId: row.cognitoUserId,
      termsVersion: row.termsVersion,
      acceptedAt: row.acceptedAt,
    });
  }
}
