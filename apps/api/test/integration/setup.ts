import 'reflect-metadata';

/**
 * Setup for the `integration` Jest project. Integration tests are
 * expected to start their own Testcontainers (typically Postgres) and
 * tear them down per `beforeAll` / `afterAll` blocks. Truncate-and-seed
 * happens in `beforeEach` so cases are isolated.
 *
 * Jest's default timeout (5s) is too tight for container startup on
 * Windows/macOS — bump it here once for every integration suite.
 */
jest.setTimeout(120_000);
