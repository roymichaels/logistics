import type { Config } from 'drizzle-kit';

export default {
  schema: './data/schema/pg.ts',
  out: './migrations/postgres',
  driver: 'pg',
  dbCredentials: {
    connectionString: process.env.DATABASE_URL!,
  },
} satisfies Config;