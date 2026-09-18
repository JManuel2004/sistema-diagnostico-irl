import { jest } from '@jest/globals';
import { InnlabCoreHttpClient } from '../../../../../../src/shared/identity/infrastructure/integrations/innlab-core-http.client.js';
import { NotFoundError } from '../../../../../../src/shared/kernel/domain/errors/not-found.error.js';
import type { AppConfig } from '../../../../../../src/config/configuration.js';

const USER_ID = 'e1f2a3b4-5c6d-4e7f-8a9b-0c1d2e3f4a5b';

const CONFIG = {
  innlabCore: {
    baseUrl: 'https://core.innlab.test',
    timeoutMs: 5000,
    internalKey: 'internal-key-de-prueba',
  },
} as AppConfig;

const CORE_RESPONSE = {
  userId: USER_ID,
  email: 'ana@icesi.edu.co',
  name: 'Ana',
  lastName: 'Ramirez',
  companyId: 'c0ffee00-1111-4222-8333-444455556666',
  companyRole: 'owner',
  workspaceId: null,
  companies: [],
};

function mockFetch(response: Partial<Response>): jest.Mock {
  const fetchMock = jest.fn().mockResolvedValue(response as never);
  globalThis.fetch = fetchMock as unknown as typeof fetch;
  return fetchMock;
}

describe('InnlabCoreHttpClient', () => {
  const originalFetch = globalThis.fetch;
  let client: InnlabCoreHttpClient;

  beforeEach(() => {
    client = new InnlabCoreHttpClient(CONFIG);
  });

  afterEach(() => {
    globalThis.fetch = originalFetch;
  });

  it('calls the context endpoint with the static internal key', async () => {
    const fetchMock = mockFetch({
      ok: true,
      status: 200,
      json: () => Promise.resolve(CORE_RESPONSE),
    });

    const context = await client.getUserContext(USER_ID);

    expect(context).toEqual(CORE_RESPONSE);
    const [url, init] = fetchMock.mock.calls[0] as [string, RequestInit];
    expect(url).toBe(`https://core.innlab.test/internal/users/${USER_ID}/context`);
    expect((init.headers as Record<string, string>)['x-internal-key']).toBe(
      'internal-key-de-prueba',
    );
  });

  it('translates a 404 from Core into a domain NotFoundError', async () => {
    mockFetch({ ok: false, status: 404 });

    await expect(client.getUserContext(USER_ID)).rejects.toThrow(NotFoundError);
  });

  it('fails loudly when our internal key is rejected', async () => {
    mockFetch({ ok: false, status: 401 });

    await expect(client.getUserContext(USER_ID)).rejects.toThrow(
      'INNLAB Core respondio 401',
    );
  });

  it('fails loudly when Core is unreachable rather than assuming no context', async () => {
    const fetchMock = jest.fn().mockRejectedValue(new Error('ECONNREFUSED') as never);
    globalThis.fetch = fetchMock as unknown as typeof fetch;

    await expect(client.getUserContext(USER_ID)).rejects.toThrow(
      'INNLAB Core no respondio',
    );
  });
});
