import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DiagnosticRepositoryPort } from '../../domain/ports/diagnostic.repository.port.js';
import { Diagnostic } from '../../domain/diagnostic.aggregate.js';
import { DiagnosticOrm } from './diagnostic.orm-entity.js';

/**
 * TypeORM-backed adapter for the `Diagnostic` aggregate.
 *
 * Mapping is symmetrical via `Diagnostic.fromPersistence` /
 * `.toPersistence`. The aggregate owns its own state and timestamps;
 * the repository only translates row shapes.
 */
@Injectable()
export class TypeOrmDiagnosticRepository implements DiagnosticRepositoryPort {
  constructor(
    @InjectRepository(DiagnosticOrm)
    private readonly orm: Repository<DiagnosticOrm>,
  ) {}

  async findById(id: string): Promise<Diagnostic | null> {
    const row = await this.orm.findOne({ where: { id } });
    return row ? this.toDomain(row) : null;
  }

  async findLatestByUserId(userId: string): Promise<Diagnostic | null> {
    const row = await this.orm.findOne({
      where: { keycloakUserId: userId },
      order: { startedAt: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Diagnostic[]> {
    const rows = await this.orm.find({
      where: { keycloakUserId: userId },
      order: { startedAt: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(diagnostic: Diagnostic): Promise<void> {
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

  private toDomain(row: DiagnosticOrm): Diagnostic {
    return Diagnostic.fromPersistence({
      id: row.id,
      userId: row.keycloakUserId,
      state: row.state,
      createdAt: row.startedAt,
      updatedAt: row.startedAt,
    });
  }
}
