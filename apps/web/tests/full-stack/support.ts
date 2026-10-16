import { expect, type Page } from '@playwright/test';

/**
 * Steps shared by the full-stack tests. Every one goes through the real
 * screens and the real API; the sign-in is the simulator's page.
 */

/** The simulated users of `tools/auth-simulator/users.json`. */
export const USERS = {
  laura: 'Laura Gómez',
  andres: 'Andrés Ríos',
  camila: 'Camila Torres',
} as const;

/** The AgroConecta case: eight Likert scores per dimension, in tab order. */
export const AGROCONECTA: readonly (readonly number[])[] = [
  [4, 4, 3, 4, 3, 3, 3, 2],
  [3, 3, 2, 3, 2, 2, 2, 2],
  [3, 2, 2, 2, 2, 2, 1, 1],
  [2, 1, 1, 1, 1, 1, 1, 1],
  [4, 3, 3, 3, 3, 2, 2, 2],
  [2, 2, 2, 2, 2, 1, 1, 1],
];

const LIKERT = [
  'Totalmente en desacuerdo',
  'En desacuerdo',
  'Ni de acuerdo ni en desacuerdo',
  'De acuerdo',
  'Totalmente de acuerdo',
];

/** Signs in through the simulator's page as `user` and lands on the panel. */
export async function signIn(page: Page, user: string): Promise<void> {
  await page.goto('/panel');
  await page.waitForURL(/\/auth\/sso/);
  await expect(page.getByText('Modo simulado.')).toBeVisible();
  await page.getByText(user).click();
  await page.waitForURL(/\/panel$/);
}

/**
 * Starts a new diagnostic from the beginning. If the user has one in
 * progress (a previous run), the app asks first: it is discarded.
 */
export async function startFresh(page: Page): Promise<void> {
  await page.goto('/diagnosticos/nuevo');
  const consent = page.getByRole('heading', {
    level: 1,
    name: 'Consentimiento para el tratamiento de datos',
  });
  const choice = page.getByRole('button', { name: 'Descartarlo y empezar uno nuevo' });
  await expect(consent.or(choice)).toBeVisible();
  if (await choice.isVisible()) await choice.click();
  await expect(consent).toBeVisible();
}

/** Accepts the consent and registers a new initiative. */
export async function consentAndInitiative(page: Page, name: string): Promise<void> {
  await page.getByRole('checkbox').check();
  await page.getByRole('button', { name: 'Aceptar y continuar' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Cuéntanos de tu iniciativa' }),
  ).toBeVisible();
  // A user with earlier initiatives is offered them: a new one is created.
  const newInitiative = page.getByRole('radio', { name: /Nueva iniciativa/ });
  if (await newInitiative.isVisible()) await newInitiative.check();
  await page.getByLabel('Nombre de la iniciativa').fill(name);
  await page.getByLabel('Sector').selectOption({ index: 1 });
  await page.getByLabel('Etapa', { exact: true }).selectOption({ index: 2 });
  await page.getByLabel('Tipo de producto o servicio').fill('Plataforma web de trazabilidad');
  await page.getByLabel('Etapa declarada').fill('Piloto con tres productores');
  await page.getByLabel('Personas en el equipo').fill('3');
  await page.getByLabel('Equipo', { exact: true }).fill('Fundadora y dos ingenieros');
  await page.getByLabel('Mercado objetivo').fill('Productores de café del Cauca');
  await page.getByLabel('Financiamiento actual').fill('Ahorros propios');
  await page.getByRole('button', { name: 'Continuar', exact: true }).click();
  await expect(page.getByRole('heading', { level: 1, name: 'Cuestionario IRL' })).toBeVisible();
}

/** Answers the statements of the first `dimensions` tabs with `scores`. */
export async function answer(
  page: Page,
  scores: readonly (readonly number[])[],
  dimensions = scores.length,
): Promise<void> {
  const tabs = page.getByRole('tab');
  for (let i = 0; i < dimensions; i += 1) {
    await tabs.nth(i).click();
    const panel = page.getByRole('tabpanel');
    const groups = panel.getByRole('radiogroup');
    for (let j = 0; j < scores[i].length; j += 1) {
      const value = scores[i][j];
      await groups
        .nth(j)
        .getByRole('radio', { name: `${String(value)} — ${LIKERT[value - 1]}` })
        .click();
    }
  }
}

/** From a complete questionnaire to the results of the profile. */
export async function processDiagnostic(page: Page): Promise<string> {
  await page.getByRole('button', { name: 'Revisar resumen' }).click();
  await expect(
    page.getByRole('heading', { level: 1, name: 'Revisa lo que vamos a procesar' }),
  ).toBeVisible();
  await page.getByRole('button', { name: 'Procesar diagnóstico' }).click();
  await page.waitForURL(/\/diagnosticos\/[0-9a-f-]+\/resultados$/, { timeout: 60_000 });
  const id = /diagnosticos\/([0-9a-f-]+)\/resultados/.exec(page.url())?.[1];
  if (id === undefined) throw new Error(`No diagnostic id in ${page.url()}`);
  return id;
}
