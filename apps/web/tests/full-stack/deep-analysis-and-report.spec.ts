import { expect, test } from '@playwright/test';
import { readFile } from 'node:fs/promises';
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
 * Plan de pruebas, E2E: the full flow with the deep analysis, and the
 * download of the PDF. Also the frontend against the real backend: every
 * request of this test reaches the API, the database and the simulator.
 */
test('del inicio de sesión al reporte en PDF, con el análisis profundo', async ({ page }) => {
  await signIn(page, USERS.laura);
  await startFresh(page);
  await consentAndInitiative(page, 'AgroConecta E2E');
  await answer(page, AGROCONECTA);
  // The answers are saved on the server while answering.
  await expect(page.getByText(/Tus respuestas se guardaron a las/)).toBeVisible();
  const id = await processDiagnostic(page);

  // Phase 1: the profile computed by the backend (AgroConecta: IPRL 1).
  await expect(page.getByText('Diagnóstico procesado.')).toBeVisible();
  await expect(page.getByText(/Propiedad Intelectual/).first()).toBeVisible();

  // Phase 2: accepting the deep analysis computes the recommendation and the route.
  await page.getByRole('button', { name: 'Adquirir análisis profundo' }).click();
  await expect(page.getByRole('link', { name: 'Ver reporte completo' })).toBeVisible({
    timeout: 60_000,
  });
  await expect(page.getByText('Célula de Grado · Posgrado').first()).toBeVisible();

  // The full report, and its PDF.
  await page.getByRole('link', { name: 'Ver reporte completo' }).click();
  await page.waitForURL(new RegExp(`/diagnosticos/${id}/reporte$`));
  await expect(page.getByRole('heading', { level: 1, name: 'AgroConecta E2E' })).toBeVisible();
  const [download] = await Promise.all([
    page.waitForEvent('download'),
    page.getByRole('button', { name: 'Descargar reporte (PDF)' }).click(),
  ]);
  expect(download.suggestedFilename()).toMatch(
    /^reporte-irl-agroconecta-e2e-\d{4}-\d{2}-\d{2}\.pdf$/,
  );
  const file = await readFile(await download.path());
  expect(file.subarray(0, 5).toString('latin1')).toBe('%PDF-');
  expect(file.length).toBeGreaterThan(10_000);
  await expect(page.getByText(/Reporte descargado/)).toBeVisible();
});
