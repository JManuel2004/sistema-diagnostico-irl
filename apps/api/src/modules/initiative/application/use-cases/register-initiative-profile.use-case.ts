import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import type { Initiative as InitiativeProfileResponse } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type InitiativeProfileRepositoryPort } from '../../domain/repositories/initiative-profile.repository.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { type ConsentTermsCatalogPort } from '../../domain/repositories/consent-terms.port.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { InitiativeProfile } from '../../domain/entities/initiative-profile.aggregate.js';
import { InitiativeRegisteredEvent } from '../../../../shared/kernel/events/initiative-registered.event.js';
import { toInitiativeProfileResponse } from '../dtos/map-initiative-response.js';
import { findOwnInitiative } from './find-own-initiative.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface RegisterInitiativeProfileCommand {
  diagnosticId: string;
  userId: string;
  initiativeId: string;
  sectorId: string;
  name: string;
  productType: string;
  stageId: string;
  declaredStage: string;
  teamSize: number;
  teamDescription: string;
  targetMarket: string;
  currentFunding: string;
}

/**
 * `RegisterInitiativeProfileUseCase` (RF-04 / HU-06): the snapshot of an
 * initiative's profile for a diagnostic.
 *
 * In order, each check failing stores nothing:
 *   1. The diagnostic exists and belongs to the caller (404 / 403).
 *   2. The initiative exists and belongs to the caller (404 / 403).
 *   3. The initiative's consent is accepted at the current version of the
 *      text (409): no initiative data is stored without it (RF-03, RNF-06).
 *   4. The diagnostic's deep analysis is not accepted yet (409): from then
 *      on the profile is frozen, because the recommendation was computed
 *      from it.
 *   5. The sector and the stage exist in the catalog (404).
 *
 * Registering the profile of the same diagnostic again replaces its
 * snapshot. Once saved it publishes `InitiativeRegisteredEvent`, and
 * `diagnosis/` moves the diagnostic on.
 */
export class RegisterInitiativeProfileUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly profiles: InitiativeProfileRepositoryPort,
    private readonly catalog: InitiativeCatalogPort,
    private readonly consents: ConsentRepositoryPort,
    private readonly terms: ConsentTermsCatalogPort,
    private readonly ownership: DiagnosticOwnershipPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    cmd: RegisterInitiativeProfileCommand,
  ): Promise<
    Result<
      InitiativeProfileResponse,
      NotFoundError | ForbiddenError | ConflictError
    >
  > {
    const owned = await this.ownership.verify(cmd.diagnosticId, cmd.userId);
    if (!owned.ok) return owned;

    const initiative = await findOwnInitiative(
      this.initiatives,
      cmd.initiativeId,
      cmd.userId,
    );
    if (!initiative.ok) return initiative;

    const [consent, current] = await Promise.all([
      this.consents.findLatestByInitiativeId(cmd.initiativeId),
      this.terms.findCurrent(),
    ]);
    if (!consent || consent.termsVersion !== current?.version) {
      return Result.err(
        new ConflictError(
          'The consent of the initiative must be accepted at the current version',
          {
            initiativeId: cmd.initiativeId,
            acceptedVersion: consent?.termsVersion ?? null,
            currentVersion: current?.version ?? null,
          },
        ),
      );
    }

    if (await this.ownership.deepAnalysisAccepted(cmd.diagnosticId)) {
      return Result.err(
        new ConflictError(
          'The initiative profile is frozen once the deep analysis is accepted',
          {
            diagnosticId: cmd.diagnosticId,
          },
        ),
      );
    }

    const sector = await this.catalog.findSectorById(cmd.sectorId);
    if (!sector) {
      return Result.err(new NotFoundError('Sector', cmd.sectorId));
    }
    const stage = await this.catalog.findStageById(cmd.stageId);
    if (!stage) {
      return Result.err(new NotFoundError('Stage', cmd.stageId));
    }

    const profile = InitiativeProfile.register({
      id: Uuid.generate(),
      initiativeId: initiative.value.id,
      diagnosticId: Uuid.create(cmd.diagnosticId),
      sectorId: sector.id,
      name: cmd.name,
      productType: cmd.productType,
      stageId: stage.id,
      declaredStage: cmd.declaredStage,
      teamSize: cmd.teamSize,
      teamDescription: cmd.teamDescription,
      targetMarket: cmd.targetMarket,
      currentFunding: cmd.currentFunding,
    });

    await this.profiles.save(profile);

    // Published once the profile is saved; `diagnosis/` reacts to it.
    await this.events.publish(
      new InitiativeRegisteredEvent({
        diagnosticId: profile.diagnosticId.value,
      }),
    );

    return Result.ok(toInitiativeProfileResponse(profile, sector, stage));
  }
}
