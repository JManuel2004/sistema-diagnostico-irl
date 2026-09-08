/** @type {import('jest').Config} */
export default {
  projects: [
    {
      displayName: 'unit',
      testMatch: ['<rootDir>/test/unit/**/*.spec.ts'],
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
    },
    {
      displayName: 'integration',
      testMatch: ['<rootDir>/test/integration/**/*.spec.ts'],
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
      testTimeout: 120_000,
    },
    {
      // Cada spec e2e arranca su propia aplicación Nest completa. Se
      // ejecutan en procesos separados (sin `--runInBand`) porque cargar
      // dos grafos de módulos completos en un mismo proceso ESM corrompe
      // el registro de módulos de Jest y la segunda suite ni siquiera
      // llega a cargarse.
      //
      // Consecuencia para quien añada una suite: comparten la base de
      // datos y corren en paralelo, así que cada una debe crear sus
      // propios datos con identificadores únicos y limpiarlos al terminar.
      // Ninguna puede asumir que es la única escribiendo.
      displayName: 'e2e',
      testMatch: ['<rootDir>/test/e2e/**/*.e2e-spec.ts'],
      preset: 'ts-jest/presets/default-esm',
      testEnvironment: 'node',
      moduleNameMapper: { '^(\\.{1,2}/.*)\\.js$': '$1' },
      testTimeout: 180_000,
    },
  ],
  collectCoverageFrom: ['src/**/*.ts', '!src/**/*.module.ts', '!src/main.ts'],
  coverageThreshold: {
    './src/modules/maturity-profile/domain/': {
      branches: 95,
      functions: 95,
      lines: 95,
    },
    './src/modules/portfolio-routing/domain/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/modules/scaling-roadmap/domain/': {
      branches: 90,
      functions: 95,
      lines: 95,
      statements: 95,
    },
    './src/modules/questionnaire/domain/': {
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
