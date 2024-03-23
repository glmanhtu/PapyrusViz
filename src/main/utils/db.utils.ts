import { drizzle, BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';

import * as Database from 'better-sqlite3';


export function createConnection(dbPath: string) : BetterSQLite3Database {
    const sqlite = new Database(dbPath);
    const db: BetterSQLite3Database = drizzle(sqlite);
    return db;
}

export function migrateDb(db: BetterSQLite3Database, schemaPath: string) {
    migrate(db, { migrationsFolder: schemaPath });
}