/**
 * The authenticated caller, as `presentation/` layers (this module's and
 * every other module's) see it.
 *
 * `presentation/` may only import from `application/`, never from `domain/`
 * (`convenciones-objetivo.md` §2). The type itself is a domain value — the
 * claims `JwtAuthGuard` puts on `req.user` — so it is re-exported here as
 * the module's published contract rather than duplicated.
 */
export type { AuthenticatedUser } from '../../domain/entities/authenticated-user.vo.js';
