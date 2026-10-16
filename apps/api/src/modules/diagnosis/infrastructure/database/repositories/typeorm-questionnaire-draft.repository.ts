import { Injectable } from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import type { QuestionnaireDraftRepositoryPort } from '../../../domain/repositories/questionnaire-draft.repository.port.js';
import { QuestionnaireDraft } from '../../../domain/entities/questionnaire-draft.aggregate.js';
import { DraftAnswerOrm } from '../orm-entities/draft-answer.orm-entity.js';

/**
 * TypeORM-backed adapter for the questionnaire draft.
 *
 * Same save policy as the answer sheet: the whole draft is replaced in one
 * transaction (DELETE then INSERT), so what is stored mirrors exactly what
 * the user last sent. The draft's date is the time of that save.
 */
@Injectable()
export class TypeOrmQuestionnaireDraftRepository implements QuestionnaireDraftRepositoryPort {
  constructor(
    @InjectRepository(DraftAnswerOrm)
    private readonly orm: Repository<DraftAnswerOrm>,
  ) {}

  async findByDiagnosticId(diagnosticId: string): Promise<QuestionnaireDraft> {
    const rows = await this.orm.find({
      where: { diagnosticId },
      order: { idStatement: 'ASC' },
    });
    if (rows.length === 0) return QuestionnaireDraft.empty(diagnosticId);

    const updatedAt = new Date(
      Math.max(...rows.map((r) => r.updatedAt.getTime())),
    );
    return QuestionnaireDraft.fromPersistence(
      diagnosticId,
      rows.map((r) => ({
        statementId: r.idStatement,
        value: r.likertValue,
        justification: r.justification,
      })),
      updatedAt,
    );
  }

  async replace(draft: QuestionnaireDraft): Promise<QuestionnaireDraft> {
    const savedAt = new Date();
    const entries = draft.entries();

    await this.orm.manager.transaction(async (manager) => {
      await manager.delete(DraftAnswerOrm, {
        diagnosticId: draft.diagnosticId,
      });
      if (entries.length > 0) {
        await manager.insert(
          DraftAnswerOrm,
          entries.map((e) =>
            manager.create(DraftAnswerOrm, {
              diagnosticId: draft.diagnosticId,
              idStatement: e.statementId,
              likertValue: e.value,
              justification: e.justification,
              updatedAt: savedAt,
            }),
          ),
        );
      }
    });

    return QuestionnaireDraft.fromPersistence(
      draft.diagnosticId,
      entries,
      entries.length > 0 ? savedAt : null,
    );
  }

  async deleteByDiagnosticId(diagnosticId: string): Promise<void> {
    await this.orm.delete({ diagnosticId });
  }
}
