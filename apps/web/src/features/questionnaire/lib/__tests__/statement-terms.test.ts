import { describe, expect, it } from 'vitest';
import { segmentStatement, STATEMENT_TERMS } from '../statement-terms';

const terms = (text: string) =>
  segmentStatement(text).flatMap((s) => (s.kind === 'term' ? [s] : []));

describe('segmentStatement — siglas y términos de las afirmaciones', () => {
  it('marca IPR con su definición y sus palabras la primera vez', () => {
    const [ipr] = terms('Hemos clarificado la titularidad y podemos usar la IPR relevante.');

    expect(ipr).toMatchObject({ text: 'IPR', expansion: 'derechos de propiedad intelectual' });
    expect(ipr.definition).toMatch(/^Derechos de propiedad intelectual/);
  });

  it('marca P&L y TAM/SAM, con su símbolo dentro de la sigla', () => {
    expect(
      terms('Contamos con proyecciones financieras simplificadas (P&L).').map((t) => t.text),
    ).toEqual(['P&L']);
    expect(
      terms('Definimos el mercado con estimaciones de tamaño (TAM/SAM).').map((t) => t.text),
    ).toEqual(['TAM/SAM']);
  });

  it('no repite las palabras de una sigla que la afirmación ya explica entre paréntesis', () => {
    const [cicd] = terms('Existen procesos de CI/CD (integración y despliegue continuo).');

    expect(cicd.text).toBe('CI/CD');
    expect(cicd.expansion).toBeUndefined();
  });

  it('marca cada término una sola vez y solo como palabra completa', () => {
    const marked = terms('La PI clave y la estrategia de PI; el PIB no cuenta.');

    expect(marked.map((t) => t.text)).toEqual(['PI']);
  });

  it('respeta mayúsculas en las siglas y no en las palabras', () => {
    expect(terms('El Pitch fue probado.').map((t) => t.text)).toEqual(['Pitch']);
    expect(terms('un pi de prueba')).toEqual([]);
  });

  it('el texto se reconstruye igual al original', () => {
    const text = 'Tenemos un pitch, una estrategia de funding y un presupuesto de P&L inicial.';

    expect(
      segmentStatement(text)
        .map((s) => s.text)
        .join(''),
    ).toBe(text);
  });

  it('cada término tiene una definición', () => {
    for (const term of STATEMENT_TERMS) expect(term.definition.length).toBeGreaterThan(5);
  });

  it('no agrega las palabras a una sigla que ya va entre paréntesis', () => {
    const [pl] = terms('Contamos con proyecciones financieras simplificadas (P&L).');

    expect(pl.expansion).toBeUndefined();
  });

  it('no marca el paréntesis que aclara un término ya marcado', () => {
    const marked = terms('Validado en un entorno operativo real (producción) por usuarios.');

    expect(marked.map((t) => t.text)).toEqual(['entorno operativo real']);
  });
});
