import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import type { ConsentRecord } from '@innlab/contracts';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { Consent } from '../../domain/entities/consent.entity.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { ConsentRecordedEvent } from '../../../../shared/kernel/events/consent-recorded.event.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

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
  cognitoUserId: string;
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
 * than silently accepted, per the contract's own documented rule. That
 * mismatch is a normal, expected outcome — not an exceptional condition.
 *
 * The diagnostic must exist and belong to the caller before anything is
 * written; that check comes first, so a user never learns whether a
 * terms version is current for a diagnostic that is not theirs.
 *
 * Once the consent is saved it publishes `ConsentRecordedEvent`, which
 * `diagnosis/` listens to in order to advance its own state machine —
 * `initiative/` never calls `diagnosis/` to do it.
 */
export class RecordConsentUseCase {
  constructor(
    private readonly consents: ConsentRepositoryPort,
    private readonly ownership: DiagnosticOwnershipPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    cmd: RecordConsentCommand,
  ): Promise<
    Result<ConsentRecord, NotFoundError | ForbiddenError | ConflictError>
  > {
    const owned = await this.ownership.verify(
      cmd.diagnosticId,
      cmd.cognitoUserId,
    );
    if (!owned.ok) return owned;

    if (cmd.version !== CURRENT_TERMS_VERSION) {
      return Result.err(
        new ConflictError(
          `Terms version mismatch: client sent '${cmd.version}', current is '${CURRENT_TERMS_VERSION}'`,
          { sent: cmd.version, current: CURRENT_TERMS_VERSION },
        ),
      );
    }

    const diagnosticId = Uuid.create(cmd.diagnosticId);
    const consent = Consent.accept({
      id: Uuid.generate(),
      diagnosticId,
      cognitoUserId: cmd.cognitoUserId,
      termsVersion: cmd.version,
    });

    await this.consents.save(consent);

    await this.events.publish(
      new ConsentRecordedEvent({ diagnosticId: consent.diagnosticId.value }),
    );

    return Result.ok({
      diagnosticId: consent.diagnosticId.value,
      version: consent.termsVersion,
      acceptedAt: consent.acceptedAt.toISOString(),
    });
  }
}
