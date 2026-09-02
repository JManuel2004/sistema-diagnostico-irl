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
  readonly email: string;
  readonly firstName?: string;
  readonly lastName?: string;
}
