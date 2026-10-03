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
    .map((b) => {
      if (b.kind === 'field') return `${b.label}: ${b.value}`;
      if (b.kind === 'radar' || b.kind === 'route') return '';
      if (b.kind === 'answers') return b.rows.map((r) => r.text).join('\n');
      return b.text;
    })
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
      'Respuestas al cuestionario',
      'Marco de referencia',
    ]);
  });

  it('draws the profile as a radar of the six levels, each point named', () => {
    const radar = buildReportDocument(aReport()).blocks.find(
      (b) => b.kind === 'radar',
    );

    expect(radar).toEqual({
      kind: 'radar',
      points: [
        { dimensionCode: 'TRL', label: 'Tecnología', level: 6 },
        { dimensionCode: 'CRL', label: 'Cliente', level: 4 },
        { dimensionCode: 'BRL', label: 'Negocio', level: 3 },
        { dimensionCode: 'IPRL', label: 'Propiedad intelectual', level: 1 },
        { dimensionCode: 'TmRL', label: 'Equipo', level: 5 },
        { dimensionCode: 'FRL', label: 'Financiación', level: 2 },
      ],
    });
  });

  it('draws each dimension today and at the end of the route', () => {
    const route = buildReportDocument(aReport()).blocks.find(
      (b) => b.kind === 'route',
    );

    if (route?.kind !== 'route') throw new Error('expected the route chart');
    expect(route.rows.find((r) => r.dimensionCode === 'CRL')).toEqual({
      dimensionCode: 'CRL',
      label: 'Cliente',
      today: 4,
      end: 5,
    });
  });

  it('lists the 48 answers by dimension, each value in words and with its justification', () => {
    const answers = buildReportDocument(aReport()).blocks.flatMap((b) =>
      b.kind === 'answers' ? [b] : [],
    );

    expect(answers.map((a) => a.dimensionCode)).toEqual([
      'TRL',
      'CRL',
      'BRL',
      'IPRL',
      'TmRL',
      'FRL',
    ]);
    expect(answers.flatMap((a) => a.rows)).toHaveLength(48);
    expect(answers[0]?.rows[0]).toEqual({
      sequence: 1,
      text: 'Afirmación 1 de Tecnología',
      value: 1,
      valueLabel: 'Totalmente en desacuerdo',
      justification: 'Justificación de Tecnología',
    });
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
