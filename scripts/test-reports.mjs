#!/usr/bin/env node
/**
 * Test reports of a run, without extra dependencies (Node built-ins only).
 *
 *   node scripts/test-reports.mjs junit <jest-or-vitest.json> <out.xml> <suite name>
 *     Converts a Jest / Vitest JSON report (`--json` / `--reporter=json`)
 *     to JUnit XML, the format Jenkins displays.
 *
 *   node scripts/test-reports.mjs matrix <reports dir> <out.md>
 *     Writes the acceptance matrix: each functional requirement of the SRS
 *     with the test cases that verify it and their result in this run.
 *     Reads from <reports dir>: api.json (Jest), web.json (Vitest),
 *     browser-mocked.json and browser-full-stack.json (Playwright JSON).
 *     A missing report counts as «no ejecutado».
 */
import { existsSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

/**
 * The 18 functional requirements of the SRS and where they are verified.
 * A selector names a report (`api`, `web`, `browser`), a test file pattern
 * and, optionally, a test name pattern.
 */
export const REQUIREMENTS = [
  {
    id: 'RF-00',
    name: 'Autenticación mediante el ecosistema INNLAB',
    tests: [
      { report: 'api', file: /identity\/(cognito-jwt-guard|.*jwt.*|.*guard.*)/ },
      { report: 'web', file: /features\/auth\/(api|hooks)\/|shared\/auth\/|ProtectedRoute/ },
      { report: 'browser', file: /full-stack\/errors/, name: /sesión inválida/ },
    ],
  },
  {
    id: 'RF-01',
    name: 'Obtención del contexto del usuario autenticado',
    tests: [
      { report: 'api', file: /identity\/.*(resolve-user-context|innlab-core|user-context)|external\/innlab-core/ },
      { report: 'web', file: /useCurrentUser|UserContextGate|UserMenu/ },
    ],
  },
  {
    id: 'RF-02',
    name: 'Acceso al diagnóstico existente',
    tests: [
      { report: 'api', file: /(start-diagnosis|view-completed-diagnosis|list-user-diagnoses|list-my-diagnoses|get-diagnosis\.use-case|get-in-progress|questionnaire-draft)/ },
      { report: 'web', file: /DashboardPage|StartDiagnosticPage/ },
      { report: 'browser', file: /full-stack\/decline-deep-analysis/ },
    ],
  },
  {
    id: 'RF-03',
    name: 'Verificación de consentimiento para el tratamiento de datos',
    tests: [
      { report: 'api', file: /(consent|record-consent|create-initiative)/ },
      { report: 'web', file: /DiagnosticWizardPage/, name: /consentimiento/i },
      { report: 'browser', file: /full-stack\/deep-analysis-and-report|e2e\/diagnostic-flow/ },
    ],
  },
  {
    id: 'RF-04',
    name: 'Captura de información de la iniciativa',
    tests: [
      { report: 'api', file: /(registration-flow|register-initiative-profile|initiative-profile|initiative\.aggregate|initiative-repository)/ },
      { report: 'web', file: /InitiativePage|InitiativeSummary|form-values|initiative-draft|DiagnosticWizardPage/, name: /iniciativa|initiative/i },
      { report: 'browser', file: /full-stack\/deep-analysis-and-report|e2e\/diagnostic-flow/ },
    ],
  },
  {
    id: 'RF-05',
    name: 'Presentación del cuestionario IRL',
    tests: [
      { report: 'api', file: /(get-questionnaire-structure|statement|questionnaire-draft|answer-sheet|answer\.entity)/ },
      { report: 'web', file: /features\/questionnaire\// },
      { report: 'browser', file: /full-stack\/deep-analysis-and-report|e2e\/diagnostic-flow/ },
    ],
  },
  {
    id: 'RF-06',
    name: 'Verificación de completitud antes de procesar el diagnóstico',
    tests: [
      { report: 'api', file: /submit-questionnaire|finalize-initial/ },
      { report: 'web', file: /QuestionnaireStep|SummaryStep|wizard-steps/ },
      { report: 'browser', file: /full-stack\/errors/, name: /incompleto/ },
    ],
  },
  {
    id: 'RF-07',
    name: 'Cálculo del nivel IRL por dimensión',
    tests: [
      { report: 'api', file: /(irl-calculator|conversion-range|irl-levels-by-dimension|compute-maturity|dimension-result|likert-value|irl-level)/ },
    ],
  },
  {
    id: 'RF-08',
    name: 'Identificación del cuello de botella principal',
    tests: [
      { report: 'api', file: /maturity-profile\.aggregate|map-maturity-profile-response/ },
      { report: 'web', file: /MaturityProfileSummary|ProfileHero/ },
    ],
  },
  {
    id: 'RF-09',
    name: 'Presentación del gráfico de perfil de madurez',
    tests: [
      { report: 'api', file: /get-maturity-profile|get-own-maturity-profile/ },
      { report: 'web', file: /MaturityRadarChart|RadarHighlight|ResultsPage|level-bar/ },
    ],
  },
  {
    id: 'RF-10',
    name: 'Señalización visual de desequilibrios dimensionales',
    tests: [
      { report: 'api', file: /imbalance|dimension-pair/ },
      { report: 'web', file: /ImbalanceInsights/ },
    ],
  },
  {
    id: 'RF-11',
    name: 'Oferta del análisis profundo al usuario',
    tests: [
      { report: 'api', file: /request-deep-analysis|deep-analysis-events|record-deep-analysis-result|deep-analysis-wiring/ },
      { report: 'web', file: /ResultsPage/, name: /análisis profundo/i },
      { report: 'browser', file: /full-stack\/(decline-deep-analysis|deep-analysis-and-report)/ },
    ],
  },
  {
    id: 'RF-12',
    name: 'Clasificación de desequilibrios entre pares de dimensiones',
    tests: [{ report: 'api', file: /imbalance-evaluator|imbalance-result/ }],
  },
  {
    id: 'RF-13',
    name: 'Detección de dimensiones en estado crítico',
    tests: [
      { report: 'api', file: /maturity-profile\.aggregate|deep-analysis-events|dimensions-seed/, name: /cr[ií]tic/i },
      { report: 'web', file: /ImbalanceInsights/, name: /cr[ií]tic/i },
    ],
  },
  {
    id: 'RF-14',
    name: 'Generación del roadmap de orientaciones por dimensión',
    tests: [
      { report: 'api', file: /modules\/roadmap\/|roadmap-repository|roadmap-graph-seed|evaluate-phase-service|phase-affinity/ },
      { report: 'web', file: /RoadmapPhaseList/ },
    ],
  },
  {
    id: 'RF-15',
    name: 'Recomendación del servicio del portafolio INNLAB',
    tests: [
      { report: 'api', file: /modules\/routing\/|recommendation-repository|routing-seed/ },
      { report: 'web', file: /LayerTracePanel/ },
      { report: 'browser', file: /full-stack\/deep-analysis-and-report/ },
    ],
  },
  {
    id: 'RF-16',
    name: 'Visualización y descarga del reporte completo',
    tests: [
      { report: 'api', file: /modules\/reporting\/(application|infrastructure)\/(dtos|use-cases\/(get|download)|pdfkit)|e2e\/modules\/reporting\/report\.e2e/ },
      { report: 'web', file: /ReportPage/ },
      { report: 'browser', file: /full-stack\/deep-analysis-and-report/ },
    ],
  },
  {
    id: 'RF-17',
    name: 'Notificación al equipo INNLAB al completar el análisis profundo',
    tests: [
      { report: 'api', file: /notify-innlab|report-mail/ },
    ],
  },
];

const REPORT_FILES = {
  api: ['api.json'],
  web: ['web.json'],
  browser: ['browser-mocked.json', 'browser-full-stack.json'],
};

const LEVEL = {
  api: (file) =>
    file.includes('/e2e/') ? 'API extremo a extremo' : file.includes('/integration/') ? 'API integración' : 'API unitaria',
  web: () => 'Frontend',
  browser: (file) => (file.includes('full-stack') ? 'Navegador, stack real' : 'Navegador, API simulada'),
};

/** Jest and Vitest share the JSON shape: testResults[].assertionResults[]. */
function casesOfJest(json, report) {
  return json.testResults.flatMap((suite) =>
    suite.assertionResults.map((a) => ({
      report,
      file: suite.name.replaceAll('\\', '/'),
      name: a.fullName ?? [...(a.ancestorTitles ?? []), a.title].join(' '),
      status: a.status === 'passed' ? 'passed' : a.status === 'failed' ? 'failed' : 'skipped',
      duration: a.duration ?? 0,
      failure: (a.failureMessages ?? []).join('\n'),
    })),
  );
}

/** Playwright JSON: nested suites, each spec with one test per browser. */
function casesOfPlaywright(json, report) {
  const out = [];
  const walk = (suite, titles) => {
    for (const spec of suite.specs ?? []) {
      for (const t of spec.tests ?? []) {
        const last = t.results?.at(-1);
        const status =
          t.status === 'skipped' ? 'skipped' : t.status === 'expected' || t.status === 'flaky' ? 'passed' : 'failed';
        out.push({
          report,
          file: `tests/${spec.file}`,
          name: `[${t.projectName}] ${[...titles, spec.title].join(' ')}`,
          status,
          duration: last?.duration ?? 0,
          failure: (last?.errors ?? []).map((e) => e.message ?? '').join('\n'),
        });
      }
    }
    for (const child of suite.suites ?? []) walk(child, child.title && !child.title.endsWith('.ts') ? [...titles, child.title] : titles);
  };
  for (const suite of json.suites ?? []) walk(suite, []);
  return out;
}

function loadCases(dir) {
  const cases = [];
  const ran = new Set();
  for (const [report, files] of Object.entries(REPORT_FILES)) {
    for (const f of files) {
      const path = join(dir, f);
      if (!existsSync(path)) continue;
      ran.add(report);
      const json = JSON.parse(readFileSync(path, 'utf8'));
      cases.push(...(report === 'browser' ? casesOfPlaywright(json, report) : casesOfJest(json, report)));
    }
  }
  return { cases, ran };
}

function escapeXml(text) {
  return String(text).replace(/[<>&'"]/g, (c) => `&#${String(c.charCodeAt(0))};`);
}

function junit(input, output, suiteName) {
  const cases = casesOfJest(JSON.parse(readFileSync(input, 'utf8')), suiteName);
  const failures = cases.filter((c) => c.status === 'failed').length;
  const skipped = cases.filter((c) => c.status === 'skipped').length;
  const body = cases
    .map((c) => {
      const classname = escapeXml(c.file.replace(/^.*?\/(test|src)\//, '$1/'));
      const head = `    <testcase classname="${classname}" name="${escapeXml(c.name)}" time="${(c.duration / 1000).toFixed(3)}"`;
      if (c.status === 'failed') return `${head}>\n      <failure>${escapeXml(c.failure)}</failure>\n    </testcase>`;
      if (c.status === 'skipped') return `${head}>\n      <skipped/>\n    </testcase>`;
      return `${head}/>`;
    })
    .join('\n');
  writeFileSync(
    output,
    `<?xml version="1.0" encoding="UTF-8"?>\n<testsuites>\n  <testsuite name="${escapeXml(suiteName)}" tests="${String(cases.length)}" failures="${String(failures)}" skipped="${String(skipped)}">\n${body}\n  </testsuite>\n</testsuites>\n`,
  );
}

function statusOf(cases) {
  if (cases.length === 0) return 'Sin casos';
  if (cases.some((c) => c.status === 'failed')) return 'Falla';
  if (cases.every((c) => c.status === 'skipped')) return 'Omitido';
  return 'Pasa';
}

function matrix(dir, output) {
  const { cases, ran } = loadCases(dir);
  const when = new Date().toLocaleString('es-CO', { dateStyle: 'long', timeStyle: 'short', timeZone: 'America/Bogota' });
  const lines = [
    '# Matriz de aceptación funcional',
    '',
    'Cada requisito funcional del SRS con los casos de prueba que lo verifican y su resultado en la última ejecución.',
    'Este archivo se genera con `node scripts/test-reports.mjs matrix <reportes> docs/testing/matriz-aceptacion.md`',
    'a partir de los reportes de Jest, Vitest y Playwright; el pipeline de Jenkins lo regenera en cada ejecución.',
    '',
    `Última ejecución: ${when}.`,
    `Reportes leídos: ${['api', 'web', 'browser'].map((r) => `${r} ${ran.has(r) ? 'sí' : 'no'}`).join(', ')}.`,
    '',
    '## Resumen',
    '',
    '| Requisito | Descripción | Casos | Pasan | Fallan | Omitidos | Niveles | Resultado |',
    '|---|---|---|---|---|---|---|---|',
  ];
  const details = [];
  for (const req of REQUIREMENTS) {
    const matched = cases.filter((c) =>
      req.tests.some((t) => t.report === c.report && t.file.test(c.file) && (t.name === undefined || t.name.test(c.name))),
    );
    const unique = [...new Map(matched.map((c) => [`${c.report}|${c.file}|${c.name}`, c])).values()];
    const count = (s) => unique.filter((c) => c.status === s).length;
    const levels = [...new Set(unique.map((c) => LEVEL[c.report](c.file)))].sort();
    lines.push(
      `| ${req.id} | ${req.name} | ${String(unique.length)} | ${String(count('passed'))} | ${String(count('failed'))} | ${String(count('skipped'))} | ${levels.join('; ') || '-'} | ${statusOf(unique)} |`,
    );
    details.push('', `### ${req.id}. ${req.name}`, '');
    if (unique.length === 0) {
      details.push('Ningún caso de esta ejecución lo cubre.');
      continue;
    }
    details.push('| Nivel | Archivo | Caso | Resultado |', '|---|---|---|---|');
    for (const c of unique) {
      const file = c.file.replace(/^.*?\/(apps\/)/, '$1').replace(/^.*?\/(test|src|tests)\//, '$1/');
      const result = c.status === 'passed' ? 'Pasa' : c.status === 'failed' ? 'Falla' : 'Omitido';
      details.push(`| ${LEVEL[c.report](c.file)} | \`${file}\` | ${c.name.replaceAll('|', '/')} | ${result} |`);
    }
  }
  const total = cases.length;
  const failed = cases.filter((c) => c.status === 'failed').length;
  lines.push(
    '',
    `Casos leídos en total: ${String(total)} (fallan ${String(failed)}). Un mismo caso puede verificar más de un requisito.`,
    '',
    '## Detalle por requisito',
    ...details,
    '',
  );
  writeFileSync(output, lines.join('\n'));
}

const [command, ...args] = process.argv.slice(2);
if (command === 'junit') junit(args[0], args[1], args[2] ?? 'tests');
else if (command === 'matrix') matrix(args[0], args[1]);
else {
  process.stderr.write('usage: test-reports.mjs junit <in.json> <out.xml> <name> | matrix <dir> <out.md>\n');
  process.exit(2);
}
