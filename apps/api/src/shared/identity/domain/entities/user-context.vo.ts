/**
 * Business context of a user, owned by INNLAB Core.
 *
 * Mirrors the response of `GET /internal/users/:userId/context` 1:1. If
 * Core changes that contract, this file is the first thing to update.
 *
 * Cross-database note: `userId` and `companyId` are logical references
 * into the `innlab_core` database. They are never foreign keys in our
 * schemas and the two databases are never joined.
 */
export interface CompanyMembership {
  readonly id: string;
  readonly name: string;
  readonly role: string;
}

export interface UserContext {
  readonly userId: string;
  readonly email: string;
  readonly name: string;
  readonly lastName: string;
  readonly companyId: string | null;
  readonly companyRole: string | null;
  /**
   * Always `null` today — workspaces are not active on the Core side.
   * A `null` here is the documented contract, not a bug on our end.
   */
  readonly workspaceId: string | null;
  readonly companies: readonly CompanyMembership[];
}
