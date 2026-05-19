import type { TypeOrmModuleOptions } from '@nestjs/typeorm';
import type { DataSourceOptions } from 'typeorm';
import type { AppConfig } from './configuration.js';

/**
 * Single TypeORM options factory shared by:
 *   - NestJS `TypeOrmModule.forRootAsync` at runtime.
 *   - The CLI `DataSource` exported from
 *     `src/infrastructure/database/data-source.ts` (migrations + seeds).
 *
 * Keeping one factory means a future change to connection pooling, SSL,
 * logging policy, or migrations glob lands in a single file and is
 * applied consistently to both runtime and CLI tooling.
 *
 * Schema isolation between `irl_catalog` and `irl_diagnostic` is set
 * per ORM entity via `@Entity({ schema: 'irl_catalog' | 'irl_diagnostic' })`
 * — this factory does not pin a default schema so cross-schema joins
 * (the typical case) work without explicit schema hints in every query.
 */

const MIGRATIONS_GLOB_SRC = 'src/infrastructure/database/migrations/*.ts';
const MIGRATIONS_GLOB_DIST = 'dist/infrastructure/database/migrations/*.js';
const ENTITIES_GLOB_SRC =
  'src/modules/**/infrastructure/persistence/**/*.orm-entity.ts';
const ENTITIES_GLOB_DIST =
  'dist/modules/**/infrastructure/persistence/**/*.orm-entity.js';

export function buildOrmModuleOptions(config: AppConfig): TypeOrmModuleOptions {
  return {
    type: 'postgres',
    url: config.database.url,
    autoLoadEntities: true,
    synchronize: false,
    migrationsRun: false,
    migrations: [MIGRATIONS_GLOB_DIST],
    migrationsTableName: 'typeorm_migrations',
    logging: config.isProduction ? ['error'] : ['error', 'warn'],
  };
}

/**
 * Variant used by the CLI `DataSource` — uses TypeScript source directly
 * since the CLI always runs via `tsx`. Including both src and dist globs
 * causes duplicate-migration errors when a dist build is present.
 */
export function buildOrmDataSourceOptions(
  config: AppConfig,
): DataSourceOptions {
  return {
    type: 'postgres',
    url: config.database.url,
    synchronize: false,
    entities: [ENTITIES_GLOB_SRC, ENTITIES_GLOB_DIST],
    migrations: [MIGRATIONS_GLOB_SRC],
    migrationsTableName: 'typeorm_migrations',
  };
}
