/**
 * Simulator of the INNLAB sign-in (Hub + Core API) for demos and tests.
 *
 * It replaces, for this system only, the four things the system uses from
 * the ecosystem:
 *
 *   1. The Hub page the SPA sends a visitor to:  GET /auth/sso?redirect=
 *   2. Core's code exchange:                     GET {api}/auth/sso/exchange?code=
 *      plus the session check and the logout:    GET {api}/auth/introspect, POST {api}/auth/logout
 *   3. The public keys the API verifies tokens with (the Cognito JWKS),
 *      and the issuer written in every token.
 *   4. Core's user context:                      GET {api}/internal/users/:id/context
 *
 * It is NOT an identity provider: no passwords, no sign-up. The page lists
 * the test users of `users.json` and signs in as the one picked. The RSA key
 * is generated at start-up and lives only in memory, so restarting the
 * simulator invalidates every token it issued.
 *
 * Only Node built-ins: no dependency to install or keep up to date.
 */
import { createServer } from 'node:http';
import { generateKeyPairSync, randomBytes, randomUUID, sign, verify } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

/** Value `AUTH_SIMULATOR_CONFIRM` must hold for the simulator to start. */
export const CONFIRMATION = 'simulated-sign-in-only';

const CODE_TTL_MS = 30_000;

function base64url(input) {
  return Buffer.from(input).toString('base64url');
}

/**
 * Reads the options from the environment. Throws when the explicit
 * confirmation is missing: starting the simulator must be a decision, never
 * the side effect of copying a compose file or an env file.
 */
export function optionsFromEnv(env = process.env) {
  if (env.AUTH_SIMULATOR_CONFIRM !== CONFIRMATION) {
    throw new Error(
      `The sign-in simulator does not start without AUTH_SIMULATOR_CONFIRM=${CONFIRMATION}. ` +
        'It signs in anyone as a test user: never point a real deployment at it.',
    );
  }
  const port = Number(env.PORT ?? 8090);
  const issuer = env.AUTH_SIMULATOR_ISSUER ?? `http://localhost:${String(port)}`;
  return {
    port,
    issuer,
    apiPrefix: env.AUTH_SIMULATOR_API_PREFIX ?? '/api',
    internalKey: env.AUTH_SIMULATOR_INTERNAL_KEY ?? 'simulated-internal-key',
    tokenTtlSeconds: Number(env.AUTH_SIMULATOR_TOKEN_TTL ?? 3600),
    allowedRedirectOrigins: (env.AUTH_SIMULATOR_REDIRECT_ORIGINS ?? 'http://localhost:5173')
      .split(',')
      .map((origin) => origin.trim())
      .filter((origin) => origin !== ''),
    users: JSON.parse(
      readFileSync(
        env.AUTH_SIMULATOR_USERS ?? fileURLToPath(new URL('./users.json', import.meta.url)),
        'utf8',
      ),
    ),
  };
}

/** Builds the simulator. `listen()` is left to the caller. */
export function createSimulator(options) {
  const { privateKey, publicKey } = generateKeyPairSync('rsa', { modulusLength: 2048 });
  // A new key id on every start: the API caches keys by id, so a restarted
  // simulator's key is fetched again instead of being mistaken for the old one.
  const kid = `auth-simulator-${randomBytes(6).toString('hex')}`;
  const jwks = { keys: [{ ...publicKey.export({ format: 'jwk' }), kid, alg: 'RS256', use: 'sig' }] };

  /** code → { userId, expiresAt } */
  const codes = new Map();
  /** `jti` of every access token ended with a logout. */
  const revoked = new Set();

  function signToken(claims) {
    const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT', kid }));
    const payload = base64url(JSON.stringify(claims));
    const signature = sign('RSA-SHA256', Buffer.from(`${header}.${payload}`), privateKey);
    return `${header}.${payload}.${base64url(signature)}`;
  }

  /** The claims of a token this simulator signed and that is still alive, or null. */
  function readValidToken(token) {
    const parts = token.split('.');
    if (parts.length !== 3) return null;
    const [header, payload, signature] = parts;
    const valid = verify(
      'RSA-SHA256',
      Buffer.from(`${header}.${payload}`),
      publicKey,
      Buffer.from(signature, 'base64url'),
    );
    if (!valid) return null;
    const claims = JSON.parse(Buffer.from(payload, 'base64url').toString('utf8'));
    if (claims.exp * 1000 <= Date.now() || revoked.has(claims.jti)) return null;
    return claims;
  }

  /**
   * Same shape as a Cognito access token of the shared pool: `sub`, issuer,
   * `token_use: 'access'` and no name or email (Core owns those).
   */
  function issueSession(user) {
    const now = Math.floor(Date.now() / 1000);
    const common = { iss: options.issuer, sub: user.id, iat: now, exp: now + options.tokenTtlSeconds, simulated: true };
    return {
      accessToken: signToken({ ...common, token_use: 'access', jti: randomUUID(), username: user.id }),
      token: signToken({
        ...common,
        token_use: 'id',
        email: user.email,
        given_name: user.name,
        family_name: user.lastName,
      }),
    };
  }

  function contextOf(user) {
    const companies = user.company === null ? [] : [user.company];
    return {
      userId: user.id,
      email: user.email,
      name: user.name,
      lastName: user.lastName,
      companyId: user.company?.id ?? null,
      companyRole: user.company?.role ?? null,
      workspaceId: null,
      companies,
    };
  }

  function isAllowedRedirect(redirect) {
    try {
      return options.allowedRedirectOrigins.includes(new URL(redirect).origin);
    } catch {
      return false;
    }
  }

  function send(res, status, body, headers = {}) {
    const isJson = typeof body === 'object' && body !== null;
    res.writeHead(status, {
      'content-type': isJson ? 'application/json' : 'text/html; charset=utf-8',
      ...headers,
    });
    res.end(isJson ? JSON.stringify(body) : (body ?? ''));
  }

  function bearerOf(req) {
    const header = req.headers.authorization ?? '';
    return header.startsWith('Bearer ') ? header.slice('Bearer '.length) : '';
  }

  // The browser calls the exchange, the introspection and the logout from
  // the SPA's origin, so they answer CORS like Core does. The internal
  // context is backend-to-backend and does not.
  const cors = {
    'access-control-allow-origin': '*',
    'access-control-allow-headers': 'authorization, content-type',
    'access-control-allow-methods': 'GET, POST, OPTIONS',
  };

  const api = options.apiPrefix;

  return createServer((req, res) => {
    const url = new URL(req.url ?? '/', 'http://simulator');
    const path = url.pathname;

    if (req.method === 'OPTIONS' && path.startsWith(`${api}/auth/`)) {
      send(res, 204, '', cors);
      return;
    }

    if (req.method === 'GET' && path === '/health') {
      send(res, 200, { status: 'ok', simulated: true });
      return;
    }

    if (req.method === 'GET' && path === '/.well-known/jwks.json') {
      send(res, 200, jwks);
      return;
    }

    if (req.method === 'GET' && path === '/auth/sso') {
      const redirect = url.searchParams.get('redirect') ?? '';
      if (!isAllowedRedirect(redirect)) {
        send(res, 400, page('Destino no permitido', '<p>La dirección de regreso no está entre las permitidas por el simulador.</p>'));
        return;
      }
      send(res, 200, chooserPage(options.users, redirect));
      return;
    }

    if (req.method === 'GET' && path === '/auth/sso/authorize') {
      const redirect = url.searchParams.get('redirect') ?? '';
      const user = options.users.find((u) => u.id === url.searchParams.get('user'));
      if (!isAllowedRedirect(redirect) || user === undefined) {
        send(res, 400, page('Solicitud inválida', '<p>Usuario o destino no reconocidos.</p>'));
        return;
      }
      const code = randomBytes(16).toString('hex');
      codes.set(code, { userId: user.id, expiresAt: Date.now() + CODE_TTL_MS });
      const target = new URL(redirect);
      target.searchParams.set('code', code);
      send(res, 302, '', { location: target.toString() });
      return;
    }

    if (req.method === 'GET' && path === `${api}/auth/sso/exchange`) {
      const code = url.searchParams.get('code') ?? '';
      const entry = codes.get(code);
      codes.delete(code);
      const user = options.users.find((u) => u.id === entry?.userId);
      if (entry === undefined || entry.expiresAt <= Date.now() || user === undefined) {
        send(res, 404, { message: 'Code not found or expired' }, cors);
        return;
      }
      send(res, 200, issueSession(user), cors);
      return;
    }

    if (req.method === 'GET' && path === `${api}/auth/introspect`) {
      const claims = readValidToken(bearerOf(req));
      if (claims === null || claims.token_use !== 'access') {
        send(res, 401, { message: 'Unauthorized' }, cors);
        return;
      }
      send(res, 200, { active: true, sub: claims.sub }, cors);
      return;
    }

    if (req.method === 'POST' && path === `${api}/auth/logout`) {
      const claims = readValidToken(bearerOf(req));
      if (claims !== null) revoked.add(claims.jti);
      send(res, 204, '', cors);
      return;
    }

    const context = new RegExp(`^${api}/internal/users/([^/]+)/context$`).exec(path);
    if (req.method === 'GET' && context !== null) {
      if (req.headers['x-internal-key'] !== options.internalKey) {
        send(res, 401, { message: 'Invalid internal key' });
        return;
      }
      const user = options.users.find((u) => u.id === decodeURIComponent(context[1]));
      if (user === undefined) {
        send(res, 404, { message: 'User not found' });
        return;
      }
      send(res, 200, contextOf(user));
      return;
    }

    send(res, 404, { message: 'Not found' });
  });
}

function escapeHtml(text) {
  return String(text).replace(/[&<>"']/g, (c) => `&#${String(c.charCodeAt(0))};`);
}

function page(title, body) {
  return `<!doctype html>
<html lang="es">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>${escapeHtml(title)}</title>
<style>
  body { font-family: system-ui, sans-serif; background: #f4f6fb; color: #1f2937; margin: 0; }
  main { max-width: 32rem; margin: 3rem auto; padding: 0 1rem; }
  .banner { background: #fef3c7; border: 1px solid #f59e0b; border-radius: .5rem; padding: .75rem 1rem; margin-bottom: 1.5rem; }
  h1 { font-size: 1.4rem; }
  ul { list-style: none; padding: 0; display: grid; gap: .75rem; }
  a.user { display: block; background: #fff; border: 1px solid #d1d5db; border-radius: .5rem; padding: 1rem; color: inherit; text-decoration: none; }
  a.user:hover, a.user:focus { border-color: #2563eb; outline: 2px solid #2563eb; }
  .name { font-weight: 600; }
  .meta { font-size: .9rem; color: #4b5563; }
</style>
</head>
<body><main>${body}</main></body>
</html>`;
}

function chooserPage(users, redirect) {
  const items = users
    .map((user) => {
      const href = `/auth/sso/authorize?user=${encodeURIComponent(user.id)}&redirect=${encodeURIComponent(redirect)}`;
      const company = user.company === null ? 'Sin organización' : user.company.name;
      return `<li><a class="user" href="${escapeHtml(href)}">
        <span class="name">${escapeHtml(`${user.name} ${user.lastName}`)}</span><br>
        <span class="meta">${escapeHtml(user.email)}</span><br>
        <span class="meta">${escapeHtml(company)}</span>
      </a></li>`;
    })
    .join('');
  return page(
    'Inicio de sesión simulado',
    `<div class="banner" role="note"><strong>Modo simulado.</strong> Este inicio de sesión no usa INNLAB ni Cognito.
     Sirve solo para demostraciones y pruebas.</div>
     <h1>Elige un usuario de prueba</h1>
     <ul>${items}</ul>`,
  );
}

// Started directly (`node server.mjs`), not imported by the tests.
if (process.argv[1] === fileURLToPath(import.meta.url)) {
  const options = optionsFromEnv();
  createSimulator(options).listen(options.port, '0.0.0.0', () => {
    process.stdout.write(
      `Sign-in simulator listening on port ${String(options.port)} (issuer ${options.issuer}). ` +
        'SIMULATED MODE: not for a real deployment.\n',
    );
  });
}
