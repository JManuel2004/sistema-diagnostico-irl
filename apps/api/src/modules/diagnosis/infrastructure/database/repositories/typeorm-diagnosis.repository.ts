import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DiagnosisRepositoryPort } from '../../../domain/repositories/diagnosis.repository.port.js';
import {
  Diagnosis,
  type DiagnosisPersistence,
} from '../../../domain/entities/diagnosis.aggregate.js';
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
      where: { cognitoUserId: userId },
      order: { startedAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Diagnosis[]> {
    const rows = await this.orm.find({
      where: { cognitoUserId: userId },
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
      this.apply(existing, snapshot);
      await this.orm.save(existing);
      return;
    }

    await this.orm.save(
      this.orm.create({
        id: snapshot.id,
        cognitoUserId: snapshot.userId,
        idFrameworkVersion: snapshot.frameworkVersionId,
        state: snapshot.state,
        startedAt: snapshot.createdAt,
      }),
    );
  }

  async modify(
    id: string,
    change: (diagnosis: Diagnosis) => void,
  ): Promise<Diagnosis | null> {
    return this.orm.manager.transaction(async (manager) => {
      const row = await manager.findOne(DiagnosisOrm, {
        where: { id },
        lock: { mode: 'pessimistic_write' },
      });
      if (!row) return null;
      const diagnosis = this.toDomain(row);
      change(diagnosis);
      this.apply(row, diagnosis.toPersistence());
      await manager.save(row);
      return diagnosis;
    });
  }

  private apply(row: DiagnosisOrm, snapshot: DiagnosisPersistence): void {
    row.state = snapshot.state;
    if (snapshot.state === 'PROFILE_GENERATED' && row.completedAt === null) {
      row.completedAt = new Date();
    }
    row.recommendationCalculatedAt = snapshot.recommendationCalculatedAt ?? null;
    row.roadmapCalculatedAt = snapshot.roadmapCalculatedAt ?? null;
  }

  private toDomain(row: DiagnosisOrm): Diagnosis {
    return Diagnosis.fromPersistence({
      id: row.id,
      userId: row.cognitoUserId,
      state: row.state,
      frameworkVersionId: row.idFrameworkVersion,
      createdAt: row.startedAt,
      recommendationCalculatedAt: row.recommendationCalculatedAt,
      roadmapCalculatedAt: row.roadmapCalculatedAt,
    });
  }
}
