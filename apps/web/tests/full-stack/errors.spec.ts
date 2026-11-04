import { expect, test } from '@playwright/test';
import { AGROCONECTA, USERS, answer, consentAndInitiative, signIn, startFresh } from './support';

/**
 * Plan de pruebas, E2E: the flow of errors. The system answers with a clear
 * message and blocks moving on where it must.
 */
test('un cuestionario incompleto no avanza y dice qué falta', async ({ page }) => {
  await signIn(page, USERS.camila);
  await startFresh(page);
  await consentAndInitiative(page, 'Incompleto E2E');
  await answer(page, AGROCONECTA, 2);

  await page.getByRole('button', { name: 'Revisar resumen' }).click();

  const alert = page.getByRole('alert');
  await expect(alert).toContainText('Hay afirmaciones sin responder');
  await expect(alert).toContainText('(0/8)');
  await expect(page).toHaveURL(/\/asistente\/cuestionario$/);
});

test('una sesión inválida lleva de nuevo al inicio de sesión', async ({ page }) => {
  await signIn(page, USERS.camila);

  // A token the API cannot verify: as if it was tampered with or forged.
  await page.evaluate(() => {
    window.localStorage.setItem(
      'innlab.session.v1',
      JSON.stringify({ token: 'x', accessToken: 'not-a-valid-token' }),
    );
  });
  await page.goto('/panel');

  await page.waitForURL(/\/auth\/sso/);
  await expect(page.getByRole('heading', { name: 'Elige un usuario de prueba' })).toBeVisible();
});

test('si el servicio no responde, el panel lo dice en vez de quedarse cargando', async ({
  page,
}) => {
  await signIn(page, USERS.camila);

  // Fault injection: the API stops answering the diagnostics.
  await page.route('**/api/v1/diagnostics**', (route) => route.abort('connectionrefused'));
  await page.reload();

  await expect(page.getByText('No fue posible cargar tu panel')).toBeVisible({ timeout: 30_000 });
});
