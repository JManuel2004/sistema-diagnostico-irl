import { describe, expect, it } from '@jest/globals';
import {
  buildReportDocument,
  reportFileName,
  type ReportBlock,
} from '../../../../../../src/modules/reporting/application/dtos/report-document.js';
import { anInitiative } from '../../support/report-sections.js';
import { aReport } from '../../support/a-report.js';

function textOf(blocks: readonly ReportBlock[]): string {
  return blocks
    .map((b) => (b.kind === 'field' ? `${b.label}: ${b.value}` : b.text))
    .join('\n');
}

function headings(blocks: readonly ReportBlock[]): string[] {
  return blocks.flatMap((b) => (b.kind === 'heading' ? [b.text] : []));
}

describe('buildReportDocument', () => {
  it('follows the order of the report on screen', () => {
    const document = buildReportDocument(aReport());

    expect(headings(document.blocks)).toEqual([
      'Datos de la iniciativa',
      'Perfil de seis dimensiones',
      'Brechas, alertas y desequilibrios',
      'Recomendación del portafolio INNLAB',
      'Roadmap de escalamiento',
      'Marco de referencia',
    ]);
  });

  it('is titled with the initiative and dated when the deep analysis finished', () => {
    const document = buildReportDocument(aReport());

    expect(document.title).toBe('Reporte del diagnóstico IRL: AgroConecta');
    expect(document.subtitle).toMatch(
      /^Análisis profundo completado el 2 de enero de 2026/,
    );
  });

  it('carries the attribution to the IRL framework and its CC BY-NC-SA 4.0 license (RNF-09)', () => {
    const document = buildReportDocument(aReport());
    const text = textOf(document.blocks);

    expect(document.footer).toBe(
      'Marco IRL © KTH Innovation. Licencia CC BY-NC-SA 4.0.',
    );
    expect(text).toContain('KTH Innovation Readiness Level (IRL)');
    expect(text).toContain(
      'https://creativecommons.org/licenses/by-nc-sa/4.0/',
    );
  });

  it('says every score with its meaning, and names dimensions instead of codes', () => {
    const text = textOf(buildReportDocument(aReport()).blocks);

    expect(text).toContain(
      'Nivel de Madurez del Modelo de Negocio: nivel 3 de 9',
    );
    expect(text).toContain('Negocio está en estado crítico');
    expect(text).toContain(
      'Tecnología y Propiedad intelectual: 5 niveles de diferencia, desequilibrio crítico.',
    );
    expect(text).not.toMatch(/\b(TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
  });

  it('lists the most severe pair first', () => {
    const bullets = buildReportDocument(aReport())
      .blocks.filter((b) => b.kind === 'bullet')
      .map((b) => (b.kind === 'bullet' ? b.text : ''))
      .filter((t) => t.includes('de diferencia'));

    expect(bullets[0]).toContain('desequilibrio crítico');
    expect(bullets[bullets.length - 1]).toContain('equilibrado');
  });

  it('includes the recommendation with its justification and the roadmap with each phase service', () => {
    const text = textOf(buildReportDocument(aReport()).blocks);

    expect(text).toContain('Célula de Grado · Posgrado');
    expect(text).toContain(
      'Por qué este servicio: Negocio y Propiedad intelectual',
    );
    expect(text).toContain('Servicio: Célula de Grado · Posgrado (Profundiza)');
    expect(text).toContain('Cliente: del nivel 4 al 5');
  });

  it('contains only the information of the diagnostic it was built from', () => {
    const other = buildReportDocument(
      aReport({ initiative: { ...anInitiative(), name: 'Otra Iniciativa' } }),
    );
    const text = textOf(other.blocks);

    expect(text).toContain('Otra Iniciativa');
    expect(text).not.toContain('AgroConecta');
  });
});

describe('reportFileName', () => {
  it('names the file after the initiative and the day, with no accents or spaces', () => {
    expect(reportFileName(aReport())).toBe(
      'reporte-irl-agroconecta-2026-01-02.pdf',
    );
    expect(
      reportFileName(
        aReport({
          initiative: { ...anInitiative(), name: 'Café Ñandú: Fase 2' },
        }),
      ),
    ).toBe('reporte-irl-cafe-nandu-fase-2-2026-01-02.pdf');
  });
});
