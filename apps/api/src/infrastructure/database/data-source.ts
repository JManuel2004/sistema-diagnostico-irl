import { DataSource } from 'typeorm';
import { config } from 'dotenv';

config({ path: '.env.local' });
config({ path: '.env' });

export default new DataSource({
  type: 'postgres',
  url: process.env.DATABASE_URL,
  entities: ['src/modules/**/infrastructure/persistence/**/*.orm-entity.ts'],
  migrations: ['src/infrastructure/database/migrations/*.ts'],
  migrationsTableName: 'typeorm_migrations',
  // schema isolation is configured per-entity via @Entity({ schema: '...' })
});
