import 'dotenv/config';
import type { Config } from 'drizzle-kit';

export default {
  schema: './workspaces/electron-app/main/entities',
  out: './workspaces/electron-app/main/assets/schema',
  driver: 'better-sqlite', // 'pg' | 'mysql2' | 'better-sqlite' | 'libsql' | 'turso'
} satisfies Config;