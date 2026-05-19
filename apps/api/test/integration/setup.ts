import 'reflect-metadata';

/**
 * Setup for the `integration` Jest project. Integration tests are
 * expected to start their own Testcontainers (typically Postgres) and
 * tear them down per `beforeAll` / `afterAll` blocks. Truncate-and-seed
 * happens in `beforeEach` so cases are isolated.
 *
 * Jest timeout is configured in jest.config.js (testTimeout: 120_000).
 */
