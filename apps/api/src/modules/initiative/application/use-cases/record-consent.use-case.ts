import type { ConsentRecord } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { type ConsentTermsCatalogPort } from '../../domain/repositories/consent-terms.port.js';
import { Consent } from '../../domain/entities/consent.entity.js';
import { toConsentRecord } from '../dtos/map-initiative-response.js';
import { findOwnInitiative } from './find-own-initiative.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface RecordConsentCommand {
  initiativeId: string;
  userId: string;
  version: string;
}

/**
 * `RecordConsentUseCase` (RF-03 / HU-05): a new acceptance of the consent of
 * an existing initiative, when the text changed version since the last one.
 *
 * The initiative must exist and belong to the caller (404 / 403), checked
 * first. The version must be the current one (409). The acceptance is added
 * to the history; earlier ones are kept.
 */
export class RecordConsentUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly consents: ConsentRepositoryPort,
    private readonly terms: ConsentTermsCatalogPort,
  ) {}

  async execute(
    cmd: RecordConsentCommand,
  ): Promise<Result<ConsentRecord, NotFoundError | ForbiddenError | ConflictError>> {
    const own = await findOwnInitiative(this.initiatives, cmd.initiativeId, cmd.userId);
    if (!own.ok) return own;

    const current = await this.terms.findCurrent();
    if (current?.version !== cmd.version) {
      return Result.err(
        new ConflictError(
          `Terms version mismatch: client sent '${cmd.version}', current is '${current?.version ?? 'none'}'`,
          { sent: cmd.version, current: current?.version ?? null },
        ),
      );
    }

    const consent = Consent.accept({
      id: Uuid.generate(),
      initiativeId: own.value.id,
      cognitoUserId: cmd.userId,
      termsVersion: cmd.version,
    });
    await this.consents.add(consent);

    return Result.ok(toConsentRecord(consent));
  }
}
