import { Inject, Injectable } from '@nestjs/common';
import type { ConsentRecord } from '@innlab/contracts';
import {
  CONSENT_REPOSITORY,
  type ConsentRepositoryPort,
} from '../../domain/repositories/consent.repository.port.js';
import { Consent } from '../../domain/entities/consent.entity.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';

/**
 * Current version of the privacy-consent text (Law 1581, RF-03).
 *
 * Same pattern as `VERSION_MARCO` in
 * `GetQuestionnaireStructureQuery` — a constant the backend owns, that
 * the client must echo back exactly. There is no `terms_version` table:
 * legal approves a new text rarely enough that a schema change per
 * version, same as the questionnaire framework version, is the right
 * amount of ceremony for how often this actually changes.
 */
export const CURRENT_TERMS_VERSION = 'v1';

export interface RecordConsentCommand {
  diagnosticId: string;
  keycloakUserId: string;
  version: string;
}

/**
 * `RecordConsentUseCase` (RF-03 / HU-05).
 *
 * `registerConsentSchema` in `@innlab/contracts` only accepts
 * `accepted: true` — a user who does not accept never sends the
 * request, so there is no "decline" path to model here. The version the
 * client sends must match `CURRENT_TERMS_VERSION`; a stale client
 * (showing an outdated text) is rejected with `ConflictError` rather
 * than silently accepted, per the contract's own documented rule.
 */
@Injectable()
export class RecordConsentUseCase {
  constructor(
    @Inject(CONSENT_REPOSITORY)
    private readonly consents: ConsentRepositoryPort,
  ) {}

  async execute(cmd: RecordConsentCommand): Promise<ConsentRecord> {
    if (cmd.version !== CURRENT_TERMS_VERSION) {
      throw new ConflictError(
        `Terms version mismatch: client sent '${cmd.version}', current is '${CURRENT_TERMS_VERSION}'`,
        { sent: cmd.version, current: CURRENT_TERMS_VERSION },
      );
    }

    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const consent = Consent.accept({
      id: Uuid.generate(),
      diagnosticId,
      keycloakUserId: cmd.keycloakUserId,
      termsVersion: cmd.version,
    });

    await this.consents.save(consent);

    return {
      diagnosticId: consent.diagnosticId.value,
      version: consent.termsVersion,
      acceptedAt: consent.acceptedAt.toISOString(),
    };
  }
}
