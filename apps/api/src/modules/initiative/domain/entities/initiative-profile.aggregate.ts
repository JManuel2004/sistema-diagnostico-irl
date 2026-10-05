import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

export const MAX_INITIATIVE_TEXT_LENGTH = 500;

export interface InitiativeProfilePersistence {
  readonly id: string;
  readonly initiativeId: string;
  readonly diagnosticId: string;
  readonly sectorId: string;
  readonly name: string;
  readonly productType: string;
  readonly stageId: string;
  readonly declaredStage: string;
  readonly teamSize: number;
  readonly teamDescription: string;
  readonly targetMarket: string;
  readonly currentFunding: string;
  readonly recordedAt: Date;
}

export interface RegisterInitiativeProfileInput {
  id: Uuid;
  initiativeId: Uuid;
  diagnosticId: Uuid;
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
 * The profile of an initiative as it was when a diagnostic was answered:
 * what it is, how far along it says it is, who is on the team, who it sells
 * to and how it is funded. One snapshot per diagnostic, so correcting it for
 * one diagnostic never changes the inputs of another one's results.
 *
 * Registered before the questionnaire (HU-06); every field is required.
 * `stageId` (catalog) is what the portfolio router reads; `declaredStage` is
 * the user's own description of it and is only shown back.
 */
export class InitiativeProfile {
  private constructor(
    public readonly id: Uuid,
    public readonly initiativeId: Uuid,
    public readonly diagnosticId: Uuid,
    public readonly sectorId: string,
    public readonly name: string,
    public readonly productType: string,
    public readonly stageId: string,
    public readonly declaredStage: string,
    public readonly teamSize: number,
    public readonly teamDescription: string,
    public readonly targetMarket: string,
    public readonly currentFunding: string,
    public readonly recordedAt: Date,
  ) {}

  static register(
    input: RegisterInitiativeProfileInput,
    now: Date = new Date(),
  ): InitiativeProfile {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 120) {
      throw new InvariantViolationError(
        `Initiative name must be between 3 and 120 characters; received ${name.length}`,
      );
    }
    if (!Number.isInteger(input.teamSize) || input.teamSize < 1) {
      throw new InvariantViolationError(
        `Initiative team size must be an integer of at least 1; received ${String(input.teamSize)}`,
      );
    }
    return new InitiativeProfile(
      input.id,
      input.initiativeId,
      input.diagnosticId,
      input.sectorId,
      name,
      InitiativeProfile.requiredText('product type', input.productType),
      input.stageId,
      InitiativeProfile.requiredText('declared stage', input.declaredStage),
      input.teamSize,
      InitiativeProfile.requiredText('team description', input.teamDescription),
      InitiativeProfile.requiredText('target market', input.targetMarket),
      InitiativeProfile.requiredText('current funding', input.currentFunding),
      now,
    );
  }

  static fromPersistence(row: InitiativeProfilePersistence): InitiativeProfile {
    return new InitiativeProfile(
      Uuid.create(row.id),
      Uuid.create(row.initiativeId),
      Uuid.create(row.diagnosticId),
      row.sectorId,
      row.name,
      row.productType,
      row.stageId,
      row.declaredStage,
      row.teamSize,
      row.teamDescription,
      row.targetMarket,
      row.currentFunding,
      row.recordedAt,
    );
  }

  toPersistence(): InitiativeProfilePersistence {
    return {
      id: this.id.value,
      initiativeId: this.initiativeId.value,
      diagnosticId: this.diagnosticId.value,
      sectorId: this.sectorId,
      name: this.name,
      productType: this.productType,
      stageId: this.stageId,
      declaredStage: this.declaredStage,
      teamSize: this.teamSize,
      teamDescription: this.teamDescription,
      targetMarket: this.targetMarket,
      currentFunding: this.currentFunding,
      recordedAt: this.recordedAt,
    };
  }

  private static requiredText(field: string, raw: string): string {
    const value = typeof raw === 'string' ? raw.trim() : '';
    if (value.length === 0 || value.length > MAX_INITIATIVE_TEXT_LENGTH) {
      throw new InvariantViolationError(
        `Initiative ${field} must be non-empty and at most ${String(MAX_INITIATIVE_TEXT_LENGTH)} characters`,
      );
    }
    return value;
  }
}
