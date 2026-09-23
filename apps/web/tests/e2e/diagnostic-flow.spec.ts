import { expect, test, type Page, type Route } from '@playwright/test';
import type { MaturityProfileResponse } from '@innlab/contracts';
import { questionnaireFixture } from '../../src/test/fixtures/questionnaire';
import { SECTORS, STAGES, initiativeFixture } from '../../src/test/fixtures/initiative';
import { dimensionResultFixture } from '../../src/test/fixtures/dimensions';

/**
 * HU-04 → HU-05 → HU-06 → HU-07/HU-10 → HU-11: a user starts a diagnostic
 * from the landing, goes through the four wizard steps and lands on the
 * results.
 */

const ID = 'a0eebc99-9c0b-4ef8-bb6d-6bb9bd380a11';

const PROFILE: MaturityProfileResponse = {
  diagnosticId: ID,
  computedAt: '2026-09-22T15:00:00.000Z',
  dimensionResults: [
    dimensionResultFixture('TRL', 6),
    dimensionResultFixture('CRL', 4),
    dimensionResultFixture('BRL', 3),
    dimensionResultFixture('IPRL', 1),
    dimensionResultFixture('TmRL', 5),
    dimensionResultFixture('FRL', 2),
  ],
  globalAverage: 3.5,
  bottleneck: { dimensions: ['IPRL'], level: 1 },
  strength: { dimensions: ['TRL'], level: 6 },
  asymmetry: { difference: 5, classification: 'critical' },
  gaps: { dimensions: ['BRL', 'IPRL', 'FRL'], threshold: 3 },
  criticalState: { dimensions: ['BRL'] },
};

/** An in-memory backend: what the app reads back is what it wrote. */
async function fakeBackend(page: Page): Promise<string[]> {
  const calls: string[] = [];
  let consent = false;
  let initiative = false;
  let completed = false;

  const json = (route: Route, body: unknown, status = 200) =>
    route.fulfill({ status, contentType: 'application/json', body: JSON.stringify(body) });
  const notFound = (route: Route) =>
    route.fulfill({
      status: 404,
      contentType: 'application/problem+json',
      body: JSON.stringify({
        type: 'x',
        title: 'nf',
        status: 404,
        detail: 'nf',
        code: 'NOT_FOUND',
      }),
    });
  const diagnostic = () => ({
    id: ID,
    userId: 'user-1',
    state: completed ? 'PROFILE_GENERATED' : 'STARTED',
    completed,
    deepAnalysisAccepted: false,
    createdAt: '2026-09-22T14:00:00.000Z',
    updatedAt: '2026-09-22T14:00:00.000Z',
  });

  await page.route('**/api/v1/**', async (route) => {
    const request = route.request();
    const path = new URL(request.url()).pathname.replace('/api/v1', '');
    const key = `${request.method()} ${path.replace(ID, ':id')}`;
    switch (key) {
      case 'POST /diagnostics':
        calls.push('start');
        return json(route, diagnostic(), 201);
      case 'GET /diagnostics':
        return json(route, [diagnostic()]);
      case 'GET /diagnostics/:id':
        return json(route, diagnostic());
      case 'GET /initiative-catalog/sectors':
        return json(route, SECTORS);
      case 'GET /initiative-catalog/stages':
        return json(route, STAGES);
      case 'GET /catalog/questionnaire':
        return json(route, questionnaireFixture());
      case 'GET /diagnostics/:id/consent':
        return consent
          ? json(route, { diagnosticId: ID, version: 'v1', acceptedAt: '2026-09-22T14:05:00.000Z' })
          : notFound(route);
      case 'POST /diagnostics/:id/consent':
        calls.push('consent');
        consent = true;
        return json(
          route,
          { diagnosticId: ID, version: 'v1', acceptedAt: '2026-09-22T14:05:00.000Z' },
          201,
        );
      case 'GET /diagnostics/:id/initiative':
        return initiative ? json(route, initiativeFixture({ diagnosticId: ID })) : notFound(route);
      case 'POST /diagnostics/:id/initiative':
        calls.push('initiative');
        initiative = true;
        return json(route, initiativeFixture({ diagnosticId: ID }), 201);
      case 'POST /diagnostics/:id/finalize-initial': {
        const body = request.postDataJSON() as { answers: unknown[] };
        calls.push(`finalize:${String(body.answers.length)}`);
        completed = true;
        return json(route, PROFILE, 201);
      }
      case 'GET /diagnostics/:id/profile':
        return completed ? json(route, PROFILE) : notFound(route);
      default:
        return route.fulfill({ status: 501, body: `unexpected ${key}` });
    }
  });
  return calls;
}

test.beforeEach(async ({ page }) => {
  // An INNLAB session, as the SSO exchange would have stored it.
  await page.addInitScript(() => {
    window.localStorage.setItem(
      'innlab.session.v1',
      JSON.stringify({ token: 'id-token', accessToken: 'access-token' }),
    );
  });
});

test('from the landing to the results through the four wizard steps', async ({ page }) => {
  const calls = await fakeBackend(page);

  await page.goto('/');
  await page.getByRole('link', { name: 'Iniciar diagnóstico' }).first().click();

  // Step 1 — the initiative: kept in the browser until the consent.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cuéntanos de tu iniciativa' }),
  ).toBeVisible();
  await page.getByLabel('Nombre de la iniciativa').fill('AgroConecta');
  await page.getByLabel('Sector').selectOption(SECTORS[0].id);
  await page.getByLabel('Etapa', { exact: true }).selectOption(STAGES[1].id);
  await page.getByLabel('Tipo de producto o servicio').fill('Plataforma web');
  await page.getByLabel('Etapa declarada').fill('Piloto con tres productores');
  await page.getByLabel('Personas en el equipo').fill('3');
  await page.getByLabel('Equipo', { exact: true }).fill('Fundadora y dos ingenieros');
  await page.getByLabel('Mercado objetivo').fill('Productores de café');
  await page.getByLabel('Financiamiento actual').fill('Ahorros propios');
  await page.getByRole('button', { name: 'Continuar' }).click();
  expect(calls).toEqual(['start']);

  // Step 2 — the consent: accepting records it, then the initiative.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Consentimiento para el tratamiento de datos' }),
  ).toBeVisible();
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await expect(page.getByText('Consentimiento registrado.')).toBeVisible();

  // Step 3 — the questionnaire: 48 answers, each with its justification.
  await expect(page.getByRole('heading', { level: 1, name: 'Cuestionario IRL' })).toBeVisible();
  const tabs = page.getByRole('tab');
  for (let i = 0; i < 6; i++) {
    await tabs.nth(i).click();
    const panel = page.getByRole('tabpanel');
    const options = panel.getByRole('radio', { name: '4 — De acuerdo' });
    const reasons = panel.getByLabel('¿Por qué elegiste este nivel?');
    for (let j = 0; j < 8; j++) {
      await options.nth(j).click();
      await reasons.nth(j).fill(`Evidencia ${String(i * 8 + j + 1)}`);
    }
  }
  await page.getByRole('button', { name: 'Revisar resumen' }).click();

  // Step 4 — the summary: processing sends the 48 answers.
  await expect(
    page.getByRole('heading', { level: 1, name: 'Revisa lo que vamos a procesar' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Procesar diagnóstico' }).click();

  // The results, the first screen with navigation.
  await expect(page).toHaveURL(`/diagnosticos/${ID}/resultados`);
  await expect(page.getByText('Diagnóstico procesado.')).toBeVisible();
  await expect(page.getByRole('navigation', { name: 'Principal' })).toBeVisible();
  expect(calls).toEqual(['start', 'consent', 'initiative', 'finalize:48']);
});
