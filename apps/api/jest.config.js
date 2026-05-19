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
    './src/modules/questionnaire/domain/': {
      branches: 90,
      functions: 90,
      lines: 90,
    },
  },
};
