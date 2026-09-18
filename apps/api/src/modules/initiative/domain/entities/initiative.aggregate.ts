import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

/**
 * `Initiative` — the basic profile of the initiative being diagnosed
 * (RF-04 / HU-06), an extension of the `company` concept that lives in
 * INNLAB Core, not a concept of this system's own domain.
 *
 * One initiative per diagnostic — `save()` is an upsert keyed by
 * `diagnosticId`, enforced at the database by `uq_initiative_diagnostic`.
 *
 * `stageId`, `teamSize` and `academicLinkage` are the characterisation
 * fields the routing engine reads (`routing/`, via
 * `GetInitiativeCharacterizationUseCase`). They stay optional here for
 * the same reason they are nullable at the database: registering an
 * initiative (this aggregate) and characterising it are two different
 * moments in the flow, and the engine already treats an absent
 * characterisation as "does not match" / "does not exclude" rather than
 * failing.
 */
export interface InitiativePersistence {
  readonly id: string;
  readonly diagnosticId: string;
  readonly sectorId: string;
  readonly name: string;
  readonly shortDescription: string;
  readonly stageId: string | null;
  readonly teamSize: number | null;
  readonly academicLinkage: boolean | null;
}

export class Initiative {
  private constructor(
    public readonly id: Uuid,
    public readonly diagnosticId: Uuid,
    public readonly sectorId: string,
    public readonly name: string,
    public readonly shortDescription: string,
    public readonly stageId: string | null,
    public readonly teamSize: number | null,
    public readonly academicLinkage: boolean | null,
  ) {}

  static register(input: {
    id: Uuid;
    diagnosticId: Uuid;
    sectorId: string;
    name: string;
    shortDescription: string;
  }): Initiative {
    const name = input.name.trim();
    if (name.length < 3 || name.length > 120) {
      throw new InvariantViolationError(
        `Initiative name must be between 3 and 120 characters; received ${name.length}`,
      );
    }
    const shortDescription = input.shortDescription.trim();
    if (shortDescription.length === 0 || shortDescription.length > 1000) {
      throw new InvariantViolationError(
        'Initiative short description must be non-empty and at most 1000 characters',
      );
    }
    return new Initiative(
      input.id,
      input.diagnosticId,
      input.sectorId,
      name,
      shortDescription,
      null,
      null,
      null,
    );
  }

  static fromPersistence(row: InitiativePersistence): Initiative {
    return new Initiative(
      Uuid.create(row.id),
      Uuid.create(row.diagnosticId),
      row.sectorId,
      row.name,
      row.shortDescription,
      row.stageId,
      row.teamSize,
      row.academicLinkage,
    );
  }

  toPersistence(): InitiativePersistence {
    return {
      id: this.id.value,
      diagnosticId: this.diagnosticId.value,
      sectorId: this.sectorId,
      name: this.name,
      shortDescription: this.shortDescription,
      stageId: this.stageId,
      teamSize: this.teamSize,
      academicLinkage: this.academicLinkage,
    };
  }
}
