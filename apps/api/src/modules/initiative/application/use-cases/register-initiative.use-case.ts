import type { EventPublisher } from '../../../../shared/kernel/application/ports/event-publisher.port.js';
import type { Initiative as InitiativeResponse } from '@innlab/contracts';
import { type InitiativeRepositoryPort } from '../../domain/repositories/initiative.repository.port.js';
import { type InitiativeCatalogPort } from '../../domain/repositories/initiative-catalog.port.js';
import { type ConsentRepositoryPort } from '../../domain/repositories/consent.repository.port.js';
import { type DiagnosticOwnershipPort } from '../../domain/repositories/diagnostic-ownership.port.js';
import { Initiative } from '../../domain/entities/initiative.aggregate.js';
import { InitiativeRegisteredEvent } from '../../../../shared/kernel/events/initiative-registered.event.js';
import { toInitiativeResponse } from '../dtos/map-initiative-response.js';
import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { NotFoundError } from '../../../../shared/kernel/domain/errors/not-found.error.js';
import { ConflictError } from '../../../../shared/kernel/domain/errors/conflict.error.js';
import type { ForbiddenError } from '../../../../shared/kernel/domain/errors/forbidden.error.js';
import { Result } from '../../../../shared/kernel/domain/result.js';

export interface RegisterInitiativeCommand {
  diagnosticId: string;
  userId: string;
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
 * `RegisterInitiativeUseCase` (RF-04 / HU-06).
 *
 * The privacy consent must be recorded first (RF-03, RNF-06): the system does
 * not store any initiative data for a diagnostic whose consent is missing, and
 * answers with `ConflictError` — a normal outcome, not an exceptional one. The
 * wizard keeps the form in the browser until the consent is accepted and only
 * then sends this request.
 */
export class RegisterInitiativeUseCase {
  constructor(
    private readonly initiatives: InitiativeRepositoryPort,
    private readonly catalog: InitiativeCatalogPort,
    private readonly consents: ConsentRepositoryPort,
    private readonly ownership: DiagnosticOwnershipPort,
    private readonly events: EventPublisher,
  ) {}

  async execute(
    cmd: RegisterInitiativeCommand,
  ): Promise<
    Result<InitiativeResponse, NotFoundError | ForbiddenError | ConflictError>
  > {
    const owned = await this.ownership.verify(cmd.diagnosticId, cmd.userId);
    if (!owned.ok) return owned;

    const consent = await this.consents.findByDiagnosticId(cmd.diagnosticId);
    if (!consent) {
      return Result.err(
        new ConflictError(
          'The privacy consent must be recorded before the initiative',
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

    const initiative = Initiative.register({
      id: Uuid.generate(),
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

    await this.initiatives.save(initiative);

    // Published once the initiative is saved; `diagnosis/` reacts to it.
    await this.events.publish(
      new InitiativeRegisteredEvent({
        diagnosticId: initiative.diagnosticId.value,
      }),
    );

    return Result.ok(toInitiativeResponse(initiative, sector, stage));
  }
}
