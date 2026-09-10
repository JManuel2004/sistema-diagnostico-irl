/**
 * Shape of `req.user` once `JwtAuthGuard` has validated the request.
 *
 * These are the only claims the shared INNLAB Cognito User Pool puts in
 * an access token. Deliberately absent: `companyId`, `companyRole` and
 * `workspaceId` — none of them live in the JWT. They live in INNLAB
 * Core and are read through `UserContextPort`, never inferred from the
 * token. See `user-context.vo.ts`.
 */
export interface AuthenticatedUser {
  /** Cognito `sub`. Same value identifies this user in every product. */
  readonly id: string;
  /**
   * All three are optional because the shared INNLAB pool does not put them
   * in an access token — a real one carries only `sub`, `token_use`, `scope`
   * and `username`. Verified against a live token, not assumed.
   *
   * So `id` is the only field to rely on here. Email and name are read from
   * INNLAB Core (`UserContext`), which is their authoritative source anyway.
   */
  readonly email?: string;
  readonly firstName?: string;
  readonly lastName?: string;
}
