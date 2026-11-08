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
      if (
        b.kind === 'route' ||
        b.kind === 'summary' ||
        b.kind === 'timeline' ||
        b.kind === 'pageBreak'
      )
        return '';
      if (b.kind === 'answers') return b.rows.map((r) => r.text).join('\n');
      if (b.kind === 'pair')
        return [
          b.title,
          b.severity,
          b.headline,
          b.advice,
          b.risk ?? '',
          b.action ?? '',
        ].join('\n');
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
      'Ruta de escalamiento',
      'Respuestas al cuestionario',
      'Términos del reporte',
      'Marco de referencia',
    ]);
  });

  it('draws the radar once, on the summary page, with the six levels', () => {
    const summary = buildReportDocument(aReport()).blocks[0];
    if (summary.kind !== 'summary') throw new Error('expected the summary');

    expect(
      summary.summary.levels.map((l) => [l.dimensionCode, l.label, l.level]),
    ).toEqual([
      ['TRL', 'Tecnología', 6],
      ['CRL', 'Cliente', 4],
      ['BRL', 'Negocio', 3],
      ['IPRL', 'Propiedad intelectual', 1],
      ['TmRL', 'Equipo', 5],
      ['FRL', 'Financiación', 2],
    ]);
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
      'Tecnología y Propiedad intelectual\ndesequilibrio crítico',
    );
    expect(text).toContain(
      'Tecnología va 5 niveles por delante de Propiedad intelectual.',
    );
    expect(text).not.toMatch(/\b(TRL|CRL|BRL|IPRL|TmRL|FRL)\b/);
  });

  it('lists the most severe pair first, and the balanced ones together at the end', () => {
    const blocks = buildReportDocument(aReport()).blocks;
    const pairs = blocks.flatMap((b) =>
      b.kind === 'pair' ? [b.severity] : [],
    );

    expect(pairs[0]).toBe('desequilibrio crítico');
    expect(pairs).not.toContain('equilibrado');
    expect(textOf(blocks)).toMatch(/Sin alerta, avanzan a un ritmo parecido: /);
  });

  it('includes the recommendation with its justification and the roadmap with each phase service', () => {
    const text = textOf(buildReportDocument(aReport()).blocks);

    expect(text).toContain(
      'Por qué este servicio: Negocio y Propiedad intelectual',
    );
    // The service of each phase is on the line of phases; the detail says why.
    expect(text).toContain('Cliente: está por debajo de lo esperado');
  });

  // The summary page says the key facts once; the detail does not repeat them.
  it('does not repeat in the detail what the summary page or the foot already say', () => {
    const document = buildReportDocument(aReport());
    const fields = document.blocks.flatMap((b) =>
      b.kind === 'field' ? [b.label] : [],
    );
    const text = textOf(document.blocks);

    // The strongest dimension and the bottleneck are summary indicators.
    expect(fields).not.toContain('Dimensión más fuerte');
    expect(fields).not.toContain('Cuello de botella');
    // The service's level, scope and alternatives are in the summary box.
    expect(fields).not.toContain('Nivel');
    expect(fields).not.toContain('Alcance y entregables');
    expect(fields).not.toContain('Otras opciones del portafolio');
    // The service of each phase and its levels are on the line of phases.
    expect(fields).not.toContain('Servicio');
    expect(text).not.toMatch(/del nivel \d+ al \d+/);
    // The completion date is in the band; the notice, at every page's foot.
    expect(fields).not.toContain('Análisis profundo completado');
    expect(text).not.toContain(document.footer);
    expect(document.banner.meta).not.toContain('KTH');
  });

  it('says the size of the team once when its description already starts with it', () => {
    const repeated = buildReportDocument(
      aReport({
        initiative: {
          ...anInitiative(),
          teamSize: 3,
          teamDescription: '3 personas — fundadora y dos ingenieros',
        },
      }),
    ).blocks.find((b) => b.kind === 'field' && b.label === 'Equipo');
    const plain = buildReportDocument(aReport()).blocks.find(
      (b) => b.kind === 'field' && b.label === 'Equipo',
    );

    expect(repeated).toMatchObject({
      value: '3 personas — fundadora y dos ingenieros',
    });
    expect(plain).toMatchObject({
      value: '3 personas. Fundadora, coordinadora y desarrollador externo',
    });
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

describe('buildReportDocument — the summary page', () => {
  it('opens with the service, the bottleneck and the critical dimensions, and the rest starts on the next page', () => {
    const blocks = buildReportDocument(aReport()).blocks;

    expect(blocks[0].kind).toBe('summary');
    expect(blocks[1].kind).toBe('pageBreak');
    if (blocks[0].kind !== 'summary') throw new Error('expected the summary');
    expect(
      blocks[0].summary.indicators.map((i) => [i.label, i.value, i.caption]),
    ).toEqual([
      [
        'Servicio recomendado',
        'Célula de Grado · Posgrado',
        'nivel Profundiza',
      ],
      ['Cuello de botella', 'Propiedad intelectual', 'nivel 1'],
      ['Dimensiones críticas', 'Negocio', 'estado crítico'],
      ['Nivel IRL global', '3,5', 'de 9 · Madurez en desarrollo'],
    ]);
    expect(blocks[0].summary.indicators[2].attention).toBe(true);
    expect(blocks[0].summary.indicators[3].detail).toBe(
      'Más fuerte: Tecnología',
    );
  });

  it('tags each level bar with why it stands out, in words', () => {
    const summary = buildReportDocument(aReport()).blocks[0];
    if (summary.kind !== 'summary') throw new Error('expected the summary');

    expect(
      summary.summary.levels.map((l) => [l.dimensionCode, l.level, l.tag]),
    ).toEqual([
      ['TRL', 6, null],
      ['CRL', 4, null],
      ['BRL', 3, 'dimensión crítica'],
      ['IPRL', 1, 'cuello de botella'],
      ['TmRL', 5, null],
      ['FRL', 2, 'en brecha'],
    ]);
  });

  it('highlights the recommended service, and maps the sections in the order they appear', () => {
    const summary = buildReportDocument(aReport()).blocks[0];
    if (summary.kind !== 'summary') throw new Error('expected the summary');

    expect(summary.summary.recommendation?.name).toBe(
      'Célula de Grado · Posgrado',
    );
    expect(summary.summary.recommendation?.tier).toBe('Profundiza');
    const document = buildReportDocument(aReport());
    const headings = document.blocks.flatMap((b) =>
      b.kind === 'heading' ? [b.text] : [],
    );
    expect(summary.summary.sections.map((s) => s.title)).toEqual([
      ...new Set(headings),
    ]);
    // Every section says what it holds: a new heading needs its line.
    for (const section of summary.summary.sections) {
      expect(section.text).not.toBe('');
    }
  });

  it('names the recommended service in the band', () => {
    const document = buildReportDocument(aReport());

    expect(document.banner.service).toBe(
      'Servicio recomendado: Célula de Grado · Posgrado',
    );
    expect(document.banner.meta).toMatch(/^Análisis profundo completado el/);
  });

  it('explains the technical terms in a section of their own', () => {
    const blocks = buildReportDocument(aReport()).blocks;
    const start = blocks.findIndex(
      (b) => b.kind === 'heading' && b.text === 'Términos del reporte',
    );
    const terms = blocks
      .slice(start + 1, start + 6)
      .map((b) => (b.kind === 'paragraph' ? b.text.split(':')[0] : ''));

    expect(terms).toEqual([
      'Nivel IRL',
      'Cuello de botella',
      'Brecha',
      'Desequilibrio',
      'Dimensión crítica',
    ]);
  });

  it('draws the route as a line of phases, each with its service and the rise of each dimension', () => {
    const timeline = buildReportDocument(aReport()).blocks.find(
      (b) => b.kind === 'timeline',
    );
    if (timeline?.kind !== 'timeline') throw new Error('expected the timeline');

    expect(timeline.phases[0]).toMatchObject({
      order: 1,
      service: 'Célula de Grado · Posgrado',
      tier: 'Profundiza',
    });
    expect(timeline.phases[0].steps).toContainEqual({
      dimensionCode: 'CRL',
      label: 'Cliente',
      from: 4,
      to: 5,
    });
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

describe('buildReportDocument — imbalances as on screen', () => {
  it('draws each pair with an alert with its levels, what it means, the risk and what to do', () => {
    const pairs = buildReportDocument(aReport()).blocks.filter(
      (b) => b.kind === 'pair',
    );

    expect(pairs.length).toBeGreaterThan(0);
    const first = pairs[0];
    if (first.kind !== 'pair') throw new Error('expected a pair');
    expect(first.severity).toBe('desequilibrio crítico');
    expect(first.critical).toBe(true);
    expect(first.dimensions).toHaveLength(2);
    expect(first.headline).toMatch(/va \d+ niveles? por delante de/);
    expect(first.advice).not.toBe('');
    expect(first.risk).not.toBeNull();
    expect(first.action).not.toBeNull();
  });

  it('explains the distance of a pair in the direction it leans, as on screen', () => {
    const text = textOf(buildReportDocument(aReport()).blocks);

    expect(text).toContain(
      'La tecnología avanza sin protección ni acuerdos de titularidad.',
    );
    expect(text).toContain(
      'Firma acuerdos sobre quién es dueño de lo creado y evalúa su protección.',
    );
  });

  it('colors the global level by its maturity band, and names the band', () => {
    const summary = buildReportDocument(aReport()).blocks[0];
    if (summary.kind !== 'summary') throw new Error('expected the summary');
    const global = summary.summary.indicators[3];

    expect(global.band).toBe('developing');
    expect(global.caption).toBe('de 9 · Madurez en desarrollo');
  });
});
