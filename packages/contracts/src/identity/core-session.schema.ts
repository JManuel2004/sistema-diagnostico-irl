import { z } from 'zod';

/**
 * INNLAB ecosystem session, as INNLAB Core delivers it in the SSO exchange
 * (`GET /auth/sso/exchange`) and as the frontend stores it and reads it
 * back from `localStorage`.
 *
 * It is validated on both surfaces because neither is trusted: the
 * response comes from an external service and the browser storage can be
 * edited outside the application. A value that does not satisfy the schema
 * is treated as "no session", not as half a session.
 *
 * `accessToken` is the only one that authenticates (Core requires
 * `token_use === 'access'`). `token` is the id_token: it is kept because
 * Core delivers it alongside, but it is not used as a credential, and a
 * session without it is still usable, so if it is missing it is taken as an
 * empty string instead of rejecting the session.
 */
export const coreSessionSchema = z
  .object({
    token: z.string().default('').describe('id_token. Identifies the user; does not authenticate.'),
    accessToken: z.string().min(1).describe('access_token. The only one valid as Bearer.'),
  })
  .describe('INNLAB Core session (id_token + access_token)');

export type CoreSession = z.infer<typeof coreSessionSchema>;
