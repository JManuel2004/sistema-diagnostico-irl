import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DiagnosisRepositoryPort } from '../../../domain/repositories/diagnosis.repository.port.js';
import { Diagnosis } from '../../../domain/entities/diagnosis.aggregate.js';
import { DiagnosisOrm } from '../orm-entities/diagnosis.orm-entity.js';

/**
 * TypeORM-backed adapter for the `Diagnosis` aggregate.
 *
 * Mapping is symmetrical via `Diagnosis.fromPersistence` /
 * `.toPersistence`. The aggregate owns its own state and timestamps;
 * the repository only translates row shapes.
 */
@Injectable()
export class TypeOrmDiagnosisRepository implements DiagnosisRepositoryPort {
  constructor(
    @InjectRepository(DiagnosisOrm)
    private readonly orm: Repository<DiagnosisOrm>,
  ) {}

  async findById(id: string): Promise<Diagnosis | null> {
    const row = await this.orm.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findLatestByUserId(userId: string): Promise<Diagnosis | null> {
    const row = await this.orm.findOne({
      where: { keycloakUserId: userId },
      order: { startedAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Diagnosis[]> {
    const rows = await this.orm.find({
      where: { keycloakUserId: userId },
      order: { startedAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(diagnostic: Diagnosis): Promise<void> {
    const snapshot = diagnostic.toPersistence();
    const existing = await this.orm.findOne({
      where: { id: snapshot.id },
    });

    if (existing) {
      existing.state = snapshot.state;
      if (snapshot.state === 'PROFILE_GENERATED' && existing.phase1CompletedAt === null) {
        existing.phase1CompletedAt = snapshot.updatedAt;
      }
      await this.orm.save(existing);
      return;
    }

    await this.orm.save(
      this.orm.create({
        id: snapshot.id,
        keycloakUserId: snapshot.userId,
        state: snapshot.state,
        startedAt: snapshot.createdAt,
      }),
    );
  }

  private toDomain(row: DiagnosisOrm): Diagnosis {
    return Diagnosis.fromPersistence({
      id: row.id,
      userId: row.keycloakUserId,
      state: row.state,
      createdAt: row.startedAt,
      updatedAt: row.startedAt,
    });
  }
}
