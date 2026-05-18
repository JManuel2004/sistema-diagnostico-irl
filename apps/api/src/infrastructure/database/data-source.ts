import { DataSource } from 'typeorm';
import { config as loadEnv } from 'dotenv';
import { loadAppConfig } from '../../config/configuration.js';
import { buildOrmDataSourceOptions } from '../../config/ormconfig.factory.js';

// Side-effect: hydrate `process.env` from local files for CLI tooling.
loadEnv({ path: '.env.local' });
loadEnv({ path: '.env' });

/**
 * Standalone `DataSource` used by the TypeORM CLI (migration:run,
 * migration:revert, migration:generate) and by the seed runner
 * (`db:seed`). The runtime application uses `TypeOrmModule.forRootAsync`
 * in `app.module.ts` and does **not** import this file.
 *
 * Both code paths read configuration through the same typed
 * `AppConfig` object (`config/configuration.ts`) and the same
 * `ormconfig.factory.ts`, so any change to connection options applies
 * everywhere from a single edit.
 */
export default new DataSource(buildOrmDataSourceOptions(loadAppConfig()));
