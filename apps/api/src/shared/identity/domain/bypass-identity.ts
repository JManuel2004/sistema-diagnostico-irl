/**
 * Fixed leader used only while `AUTH_BYPASS` is on.
 *
 * The id is a UUID so it satisfies the same contract as a Cognito `sub`.
 * It is not a person in INNLAB Core and must never be sent there.
 */
export const BYPASS_ISSUER = 'irl-diagnostic-bypass';

export const BYPASS_USER_ID = 'b1a55e55-0000-4000-8000-000000000001';

export const BYPASS_EMAIL = 'lider.prueba@innlab.local';

export const BYPASS_FIRST_NAME = 'Líder';

export const BYPASS_LAST_NAME = 'de prueba';
