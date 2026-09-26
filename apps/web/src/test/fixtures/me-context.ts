import { http, HttpResponse } from 'msw';
import type { MeContextResponse } from '@innlab/contracts';
import { saveSession } from '@/shared/auth/session';

/** The profile `GET /me/context` serves for the signed-in user. */
export const ME_CONTEXT: MeContextResponse = {
  user: {
    id: 'e17bc500-30f1-7037-ff18-f860e2b77806',
    email: 'lider@agroconecta.co',
    firstName: 'Laura',
    lastName: 'Gómez',
  },
  core: { companyId: null, companyRole: null, workspaceId: null, companies: [] },
};

/** Stores a session, as the SSO exchange would; `useCurrentUser` only asks with one. */
export function signIn(): void {
  saveSession({ token: 'id-token', accessToken: 'access-token' });
}

/** MSW handler for the profile; `status` other than 200 simulates Core being down. */
export function meContextHandler(status = 200) {
  return http.get('*/me/context', () =>
    status === 200
      ? HttpResponse.json(ME_CONTEXT)
      : HttpResponse.json(
          { type: 'x', title: 'unavailable', status, detail: 'x', code: 'CORE_UNAVAILABLE' },
          { status },
        ),
  );
}
