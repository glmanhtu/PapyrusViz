import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './src/main/entities',
  out: './schema',
  driver: 'better-sqlite', // 'pg' | 'mysql2' | 'better-sqlite' | 'libsql' | 'turso'
} satisfies Config;