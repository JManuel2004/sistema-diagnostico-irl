import { Uuid } from '../../../../shared/kernel/domain/value-objects/uuid.vo.js';
import { InvariantViolationError } from '../../../../shared/kernel/domain/errors/invariant-violation.error.js';

/**
 * `Consent` — the Law 1581 (2012) privacy-consent acceptance for a
 * single diagnostic (RF-03 / HU-05). A sub-concept of `initiative/`, not
 * of `diagnosis/` — see `convenciones-objetivo.md` §1.3: the resolved
 * business decision is that consent travels with the rest of the
 * initiative profile, since Law 1581 ties consent to the data that is
 * about to be processed, and most of that data is the initiative's.
 *
 * One consent record per diagnostic — `save()` is an upsert keyed by
 * `diagnosticId`, enforced at the database by `uq_consent_diagnostic`.
 * There is no `accepted: false` state to persist: a user who does not
 * accept simply never sends the request (see `registerConsentSchema` in
 * `@innlab/contracts`), so `accepted` is always `true` once a record
 * exists — the field is kept (rather than dropped in favor of "record
 * exists = accepted") only because the column already carries that
 * shape at the database and changing it is not this oleada's job.
 */
export interface ConsentPersistence {
  readonly id: string;
  readonly diagnosticId: string;
  readonly keycloakUserId: string;
  readonly accepted: boolean;
  readonly acceptedAt: Date;
  readonly termsVersion: string;
}

export class Consent {
  private constructor(
    public readonly id: Uuid,
    public readonly diagnosticId: Uuid,
    public readonly keycloakUserId: string,
    public readonly accepted: boolean,
    public readonly acceptedAt: Date,
    public readonly termsVersion: string,
  ) {}

  static accept(input: {
    id: Uuid;
    diagnosticId: Uuid;
    keycloakUserId: string;
    termsVersion: string;
    now?: Date;
  }): Consent {
    if (!/^v\d+(\.\d+)*$/.test(input.termsVersion)) {
      throw new InvariantViolationError(
        `Invalid terms version format: '${input.termsVersion}'`,
      );
    }
    return new Consent(
      input.id,
      input.diagnosticId,
      input.keycloakUserId,
      true,
      input.now ?? new Date(),
      input.termsVersion,
    );
  }

  static fromPersistence(row: ConsentPersistence): Consent {
    return new Consent(
      Uuid.create(row.id),
      Uuid.create(row.diagnosticId),
      row.keycloakUserId,
      row.accepted,
      row.acceptedAt,
      row.termsVersion,
    );
  }

  toPersistence(): ConsentPersistence {
    return {
      id: this.id.value,
      diagnosticId: this.diagnosticId.value,
      keycloakUserId: this.keycloakUserId,
      accepted: this.accepted,
      acceptedAt: this.acceptedAt,
      termsVersion: this.termsVersion,
    };
  }
}
