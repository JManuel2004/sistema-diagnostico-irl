/**
 * Contract of the sign-in simulator: it must answer exactly what the SPA
 * and the API read from the real Hub, Core and Cognito.
 *
 *   node --test tools/auth-simulator
 */
import { after, before, describe, it } from 'node:test';
import assert from 'node:assert/strict';
import { createPublicKey, verify } from 'node:crypto';
import { CONFIRMATION, createSimulator, optionsFromEnv } from './server.mjs';

const SPA = 'http://localhost:5173';
const INTERNAL_KEY = 'test-internal-key';

let server;
let base;
let options;

function claimsOf(token) {
  return JSON.parse(Buffer.from(token.split('.')[1], 'base64url').toString('utf8'));
}

async function signIn(userIndex = 0) {
  const user = options.users[userIndex];
  const authorize = await fetch(
    `${base}/auth/sso/authorize?user=${user.id}&redirect=${encodeURIComponent(`${SPA}/auth/callback`)}`,
    { redirect: 'manual' },
  );
  const code = new URL(authorize.headers.get('location')).searchParams.get('code');
  const exchange = await fetch(`${base}/api/auth/sso/exchange?code=${code}`);
  return { user, code, session: await exchange.json() };
}

before(async () => {
  options = {
    ...optionsFromEnv({ AUTH_SIMULATOR_CONFIRM: CONFIRMATION, AUTH_SIMULATOR_INTERNAL_KEY: INTERNAL_KEY }),
    issuer: 'http://localhost:8090',
  };
  server = createSimulator(options);
  await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve));
  base = `http://127.0.0.1:${String(server.address().port)}`;
});

after(() => {
  server.close();
});

describe('start-up guard', () => {
  it('refuses to start without the explicit confirmation', () => {
    assert.throws(() => optionsFromEnv({}), /AUTH_SIMULATOR_CONFIRM/);
    assert.throws(() => optionsFromEnv({ AUTH_SIMULATOR_CONFIRM: 'true' }), /AUTH_SIMULATOR_CONFIRM/);
  });
});

describe('hub page', () => {
  it('lists the test users and marks the page as simulated', async () => {
    const res = await fetch(`${base}/auth/sso?redirect=${encodeURIComponent(`${SPA}/auth/callback`)}`);
    const html = await res.text();
    assert.equal(res.status, 200);
    assert.match(html, /Modo simulado/);
    for (const user of options.users) assert.match(html, new RegExp(user.email));
  });

  it('refuses to send the code to an origin that is not allowed', async () => {
    const res = await fetch(`${base}/auth/sso?redirect=${encodeURIComponent('https://evil.example/cb')}`);
    assert.equal(res.status, 400);
  });
});

describe('code exchange', () => {
  it('returns an access token Cognito-shaped and signed with the published key', async () => {
    const { user, session } = await signIn();
    const access = claimsOf(session.accessToken);
    assert.equal(access.sub, user.id);
    assert.equal(access.iss, 'http://localhost:8090');
    assert.equal(access.token_use, 'access');
    assert.equal(claimsOf(session.token).token_use, 'id');

    const jwks = await (await fetch(`${base}/.well-known/jwks.json`)).json();
    const [header, payload, signature] = session.accessToken.split('.');
    const kid = JSON.parse(Buffer.from(header, 'base64url').toString('utf8')).kid;
    const key = createPublicKey({ key: jwks.keys.find((k) => k.kid === kid), format: 'jwk' });
    assert.ok(verify('RSA-SHA256', Buffer.from(`${header}.${payload}`), key, Buffer.from(signature, 'base64url')));
  });

  it('names its key differently on every start, so a restart is never mistaken for the old key', async () => {
    const other = createSimulator(options);
    await new Promise((resolve) => other.listen(0, '127.0.0.1', resolve));
    const otherBase = `http://127.0.0.1:${String(other.address().port)}`;
    const [mine, theirs] = await Promise.all(
      [base, otherBase].map(async (b) => (await (await fetch(`${b}/.well-known/jwks.json`)).json()).keys[0].kid),
    );
    other.close();
    assert.notEqual(mine, theirs);
  });

  it('accepts each code once, like Core', async () => {
    const { code } = await signIn();
    const again = await fetch(`${base}/api/auth/sso/exchange?code=${code}`);
    assert.equal(again.status, 404);
  });
});

describe('session check and logout', () => {
  it('reports the session alive until the logout ends it', async () => {
    const { session } = await signIn();
    const auth = { authorization: `Bearer ${session.accessToken}` };
    assert.equal((await fetch(`${base}/api/auth/introspect`, { headers: auth })).status, 200);
    assert.equal((await fetch(`${base}/api/auth/logout`, { method: 'POST', headers: auth })).status, 204);
    assert.equal((await fetch(`${base}/api/auth/introspect`, { headers: auth })).status, 401);
  });

  it('does not take the id token as a session', async () => {
    const { session } = await signIn();
    const res = await fetch(`${base}/api/auth/introspect`, { headers: { authorization: `Bearer ${session.token}` } });
    assert.equal(res.status, 401);
  });
});

describe('user context', () => {
  it('answers the context of a known user with the internal key', async () => {
    const user = options.users[0];
    const res = await fetch(`${base}/api/internal/users/${user.id}/context`, {
      headers: { 'x-internal-key': INTERNAL_KEY },
    });
    const body = await res.json();
    assert.equal(res.status, 200);
    assert.equal(body.userId, user.id);
    assert.equal(body.email, user.email);
    assert.equal(body.companyId, user.company.id);
    assert.equal(body.companies.length, 1);
  });

  it('answers a user without organization with empty company fields', async () => {
    const user = options.users.find((u) => u.company === null);
    const body = await (
      await fetch(`${base}/api/internal/users/${user.id}/context`, { headers: { 'x-internal-key': INTERNAL_KEY } })
    ).json();
    assert.equal(body.companyId, null);
    assert.deepEqual(body.companies, []);
  });

  it('rejects a wrong internal key and an unknown user', async () => {
    const user = options.users[0];
    const wrongKey = await fetch(`${base}/api/internal/users/${user.id}/context`, { headers: { 'x-internal-key': 'x' } });
    const unknown = await fetch(`${base}/api/internal/users/nobody/context`, { headers: { 'x-internal-key': INTERNAL_KEY } });
    assert.equal(wrongKey.status, 401);
    assert.equal(unknown.status, 404);
  });
});
