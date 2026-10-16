import { expect, test } from '@playwright/test';
import {
  AGROCONECTA,
  USERS,
  answer,
  consentAndInitiative,
  processDiagnostic,
  signIn,
  startFresh,
} from './support';

/**
 * Plan de pruebas, E2E: the flow where the leader does not continue with
 * the deep analysis. «Por ahora no» records nothing: the diagnostic keeps
 * its profile, has no report, and can still accept the analysis later.
 */
test('el líder no continúa con el análisis profundo', async ({ page }) => {
  await signIn(page, USERS.andres);
  await startFresh(page);
  await consentAndInitiative(page, 'Sin análisis profundo E2E');
  await answer(page, AGROCONECTA);
  const id = await processDiagnostic(page);

  await page.getByRole('link', { name: 'Ir a mi panel' }).click();
  await page.waitForURL(/\/panel$/);

  // The diagnostic is listed with its initial profile, nothing more.
  const history = page.getByRole('region', { name: 'Tus diagnósticos' });
  const row = history
    .getByRole('listitem')
    .filter({ hasText: 'Sin análisis profundo E2E' })
    .first();
  await expect(row).toContainText('Perfil inicial');
  await expect(page.getByRole('link', { name: 'Continuar diagnóstico' })).toHaveCount(0);

  // Its results still offer the analysis, and there is no report yet.
  await row.getByRole('link', { name: /Ver resultados/ }).click();
  await expect(page.getByRole('button', { name: 'Adquirir análisis profundo' })).toBeVisible();
  await expect(page.getByRole('link', { name: 'Ver reporte completo' })).toHaveCount(0);
  await page.goto(`/diagnosticos/${id}/reporte`);
  await expect(
    page.getByText(/solo está disponible después de completar el análisis profundo/),
  ).toBeVisible();
  await expect(page.getByRole('button', { name: 'Descargar reporte (PDF)' })).toHaveCount(0);
});
