import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/app/core/ipc-models',
  out: './schema',
  driver: 'better-sqlite', // 'pg' | 'mysql2' | 'better-sqlite' | 'libsql' | 'turso'
} satisfies Config;