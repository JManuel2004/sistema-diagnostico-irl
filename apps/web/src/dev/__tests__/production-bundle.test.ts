import { execFileSync } from 'node:child_process';
import { mkdtempSync, readdirSync, readFileSync, rmSync, statSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterAll, describe, expect, it } from 'vitest';

/**
 * The AgroConecta autofill must not reach a production bundle (Oleada 8).
 *
 * The guard is a build-time variable, so the only real proof is to build the
 * app the way production does — `vite build`, mode `production`, which does
 * not load `.env.development` — and look in the output for the case data and
 * the button. A second build in `development` mode shows the search itself
 * works: the same strings are found there.
 */
const ROOT = join(import.meta.dirname, '..', '..', '..');
const out = mkdtempSync(join(tmpdir(), 'innlab-web-'));

const NEEDLES = [
  'desarrollador externo contratado por proyecto',
  'Notion con diagramas de flujo',
  'Autocompletar con AgroConecta',
  'dev-autofill-questionnaire',
];

function build(mode: 'production' | 'development', dir: string): void {
  execFileSync('npx', ['vite', 'build', '--mode', mode, '--outDir', dir, '--emptyOutDir'], {
    cwd: ROOT,
    stdio: 'pipe',
  });
}

function outputText(dir: string): string {
  const chunks: string[] = [];
  const walk = (d: string): void => {
    for (const name of readdirSync(d)) {
      const path = join(d, name);
      if (statSync(path).isDirectory()) walk(path);
      else if (name.endsWith('.js') || name.endsWith('.html'))
        chunks.push(readFileSync(path, 'utf8'));
    }
  };
  walk(dir);
  return chunks.join('\n');
}

afterAll(() => {
  rmSync(out, { recursive: true, force: true });
});

describe('development autofill and the production bundle', () => {
  it('a production build contains neither the AgroConecta data nor the autofill buttons', () => {
    const dir = join(out, 'production');
    build('production', dir);

    const text = outputText(dir);
    expect(text.length).toBeGreaterThan(10_000);
    for (const needle of NEEDLES) {
      expect(text, `production bundle contains "${needle}"`).not.toContain(needle);
    }
  }, 120_000);

  it('a development build does contain them (so the search above proves something)', () => {
    const dir = join(out, 'development');
    build('development', dir);

    const text = outputText(dir);
    for (const needle of NEEDLES) {
      expect(text, `development bundle lacks "${needle}"`).toContain(needle);
    }
  }, 120_000);
});
