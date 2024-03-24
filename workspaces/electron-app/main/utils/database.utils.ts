import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';


export function createConnection(databasePath: string) : BetterSQLite3Database {
    const sqlite = new Database(databasePath);
    return drizzle(sqlite);
}

export function migrateDatabase(database: BetterSQLite3Database, schemaPath: string) {
    migrate(database, { migrationsFolder: schemaPath });
}