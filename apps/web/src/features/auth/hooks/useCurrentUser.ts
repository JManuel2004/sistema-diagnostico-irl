import { useQuery } from '@tanstack/react-query';
import { queryKeys } from '@/shared/api/query-keys';
import { hasStoredSession } from '@/shared/auth/session';
import { getMeContext } from '../api/me.api';

/**
 * The authenticated user and their company context (DIAGIRL-25).
 *
 * The only source of the profile in the frontend. The shared pool's access
 * token carries only the `sub`, so name and email cannot be read from it:
 * they have to be requested.
 *
 * `enabled` avoids firing the query without a stored session, which would
 * answer 401 and make the `http` interceptor send the user to the Hub while
 * `ProtectedRoute` is already redirecting them.
 *
 * No retries: the context depends on INNLAB Core answering, and when it is
 * down it is better to say so quickly and offer a manual retry (RF-01,
 * scenario "user context unavailable") than to keep the screen waiting while
 * automatic retries run out.
 */
export function useCurrentUser() {
  return useQuery({
    queryKey: queryKeys.session.context,
    queryFn: getMeContext,
    enabled: hasStoredSession(),
    staleTime: 5 * 60 * 1000,
    retry: false,
  });
}
