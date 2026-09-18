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

  async findByDiagnosticId(diagnosticId: string): Promise<Consent | null> {
    const row = await this.orm.findOne({ where: { idDiagnostic: diagnosticId } });
    return row ? this.toDomain(row) : null;
  }

  /**
   * Upsert keyed by `diagnosticId` (`uq_consent_diagnostic`) — same
   * pattern as `TypeOrmInitiativeRepository.save`.
   */
  async save(consent: Consent): Promise<void> {
    const snapshot = consent.toPersistence();
    const existing = await this.orm.findOne({
      where: { idDiagnostic: snapshot.diagnosticId },
    });

    await this.orm.save(
      this.orm.create({
        id: existing?.id ?? snapshot.id,
        idDiagnostic: snapshot.diagnosticId,
        keycloakUserId: snapshot.keycloakUserId,
        accepted: snapshot.accepted,
        acceptedAt: snapshot.acceptedAt,
        termsVersion: snapshot.termsVersion,
      }),
    );
  }

  private toDomain(row: ConsentOrm): Consent {
    return Consent.fromPersistence({
      id: row.id,
      diagnosticId: row.idDiagnostic,
      keycloakUserId: row.keycloakUserId,
      accepted: row.accepted,
      acceptedAt: row.acceptedAt,
      termsVersion: row.termsVersion,
    });
  }
}
