import 'reflect-metadata';

/**
 * Setup for the `e2e` Jest project.
 *
 * Each e2e suite is responsible for booting a NestJS application with
 * `Test.createTestingModule`, attaching supertest, mocking external
 * services with `nock` (Keycloak JWKS, InnLab Core), and exercising one
 * full HTTP round trip per Gherkin scenario from the target story.
 *
 * Long startup time → generous default timeout.
 */
jest.setTimeout(180_000);
