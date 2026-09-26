import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

/**
 * `Consent` — one acceptance of the Law 1581 (2012) privacy consent for an
 * initiative (RF-03 / HU-05).
 *
 * The consent belongs to the initiative, not to one diagnostic: it is
 * accepted when the initiative is created and again only when the text
 * changes version. Acceptances are a history — a new one never replaces
 * an earlier one, because the record of what was accepted and when is the
 * point of keeping them. There is no `accepted` flag: a user who does not
 * accept never sends the request, so a row existing is the acceptance.
 */
export interface ConsentPersistence {
  readonly id: string;
  readonly initiativeId: string;
  readonly cognitoUserId: string;
  readonly termsVersion: string;
  readonly acceptedAt: Date;
}

export class Consent {
  private constructor(
    public readonly id: Uuid,
    public readonly initiativeId: Uuid,
    public readonly cognitoUserId: string,
    public readonly termsVersion: string,
    public readonly acceptedAt: Date,
  ) {}

  static accept(input: {
    id: Uuid;
    initiativeId: Uuid;
    cognitoUserId: string;
    termsVersion: string;
    now?: Date;
  }): Consent {
    if (!/^v\d+(\.\d+)*$/.test(input.termsVersion)) {
      throw new InvariantViolationError(`Invalid terms version format: '${input.termsVersion}'`);
    }
    return new Consent(
      input.id,
      input.initiativeId,
      input.cognitoUserId,
      input.termsVersion,
      input.now ?? new Date(),
    );
  }

  static fromPersistence(row: ConsentPersistence): Consent {
    return new Consent(
      Uuid.create(row.id),
      Uuid.create(row.initiativeId),
      row.cognitoUserId,
      row.termsVersion,
      row.acceptedAt,
    );
  }

  toPersistence(): ConsentPersistence {
    return {
      id: this.id.value,
      initiativeId: this.initiativeId.value,
      cognitoUserId: this.cognitoUserId,
      termsVersion: this.termsVersion,
      acceptedAt: this.acceptedAt,
    };
  }
}
