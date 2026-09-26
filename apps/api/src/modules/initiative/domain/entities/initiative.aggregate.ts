import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';

/**
 * An initiative of a user: the venture that is diagnosed, possibly several
 * times. It has an identity of its own, independent of any diagnostic, so
 * its diagnostics can be followed over time; its consent (Law 1581) is
 * accepted once for the initiative, and each diagnostic keeps a snapshot of
 * its profile (`InitiativeProfile`).
 *
 * The owner is the Cognito user who created it. When INNLAB Core exposes
 * the company, this is where its identifier will live.
 */
export interface InitiativePersistence {
  readonly id: string;
  readonly ownerId: string;
  readonly createdAt: Date;
}

export class Initiative {
  private constructor(
    public readonly id: Uuid,
    public readonly ownerId: string,
    public readonly createdAt: Date,
  ) {}

  static create(ownerId: string, now: Date = new Date()): Initiative {
    return new Initiative(Uuid.generate(), ownerId, now);
  }

  static fromPersistence(row: InitiativePersistence): Initiative {
    return new Initiative(Uuid.create(row.id), row.ownerId, row.createdAt);
  }

  isOwnedBy(userId: string): boolean {
    return this.ownerId === userId;
  }

  toPersistence(): InitiativePersistence {
    return { id: this.id.value, ownerId: this.ownerId, createdAt: this.createdAt };
  }
}
