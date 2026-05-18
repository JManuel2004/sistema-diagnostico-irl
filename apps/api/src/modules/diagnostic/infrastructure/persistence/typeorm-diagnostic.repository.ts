import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { DiagnosticRepositoryPort } from '../../domain/ports/diagnostic.repository.port.js';
import { Diagnostico } from '../../domain/diagnostic.aggregate.js';
import { DiagnosticoOrm } from './diagnostico.orm-entity.js';

/**
 * TypeORM-backed adapter for the `Diagnostico` aggregate.
 *
 * Mapping is symmetrical via `Diagnostico.fromPersistence` /
 * `.toPersistence`. The aggregate owns its own state and timestamps;
 * the repository only translates row shapes.
 */
@Injectable()
export class TypeOrmDiagnosticRepository implements DiagnosticRepositoryPort {
  constructor(
    @InjectRepository(DiagnosticoOrm)
    private readonly orm: Repository<DiagnosticoOrm>,
  ) {}

  async findById(id: string): Promise<Diagnostico | null> {
    const row = await this.orm.findOne({ where: { idDiagnostico: id } });
    return row ? this.toDomain(row) : null;
  }

  async findLatestByUserId(userId: string): Promise<Diagnostico | null> {
    const row = await this.orm.findOne({
      where: { idUsuario: userId },
      order: { creadoEn: 'DESC' },
    });
    return row ? this.toDomain(row) : null;
  }

  async findAllByUserId(userId: string): Promise<Diagnostico[]> {
    const rows = await this.orm.find({
      where: { idUsuario: userId },
      order: { creadoEn: 'DESC' },
    });
    return rows.map((r) => this.toDomain(r));
  }

  async save(diagnostico: Diagnostico): Promise<void> {
    const snapshot = diagnostico.toPersistence();
    await this.orm.save(
      this.orm.create({
        idDiagnostico: snapshot.id,
        idUsuario: snapshot.userId,
        estado: snapshot.state,
        creadoEn: snapshot.createdAt,
        actualizadoEn: snapshot.updatedAt,
      }),
    );
  }

  private toDomain(row: DiagnosticoOrm): Diagnostico {
    return Diagnostico.fromPersistence({
      id: row.idDiagnostico,
      userId: row.idUsuario,
      state: row.estado,
      createdAt: row.creadoEn,
      updatedAt: row.actualizadoEn,
    });
  }
}
