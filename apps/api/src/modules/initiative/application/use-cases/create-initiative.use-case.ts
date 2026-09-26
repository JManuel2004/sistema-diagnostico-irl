import type { InitiativeSummary } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type ConsentTermsCatalogPort } from '../../domain/repositories/consent-terms.port.js';
import { Initiative } from '../../domain/entities/initiative.aggregate.js';
import { Consent } from '../../domain/entities/consent.entity.js';
import { toConsentRecord } from '../dtos/map-initiative-response.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface CreateInitiativeCommand {
  userId: string;
  /** The version of the consent text the user accepted. */
  termsVersion: string;
}

/**
 * Creates an initiative of the user together with the acceptance of its
 * consent (RF-03, RNF-06): nothing about an initiative is stored before the
 * consent, so the initiative is born with it. The profile comes later, per
 * diagnostic.
 *
 * The version must be the current one; a client that showed an older text
 * gets `ConflictError` (409).
 */
export class CreateInitiativeUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly terms: ConsentTermsCatalogPort,
  ) {}

  async execute(cmd: CreateInitiativeCommand): Promise<Result<InitiativeSummary, ConflictError>> {
    const current = await this.terms.findCurrent();
    if (current?.version !== cmd.termsVersion) {
      return Result.err(
        new ConflictError(
          `Terms version mismatch: client sent '${cmd.termsVersion}', current is '${current?.version ?? 'none'}'`,
          { sent: cmd.termsVersion, current: current?.version ?? null },
        ),
      );
    }

    const initiative = Initiative.create(cmd.userId);
    const consent = Consent.accept({
      id: Uuid.generate(),
      initiativeId: initiative.id,
      cognitoUserId: cmd.userId,
      termsVersion: cmd.termsVersion,
    });
    await this.initiatives.createWithConsent(initiative, consent);

    return Result.ok({
      id: initiative.id.value,
      createdAt: initiative.createdAt.toISOString(),
      consent: toConsentRecord(consent),
      consentCurrent: true,
      latestProfile: null,
    });
  }
}
