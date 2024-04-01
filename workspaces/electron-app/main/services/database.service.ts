import { BetterSQLite3Database, drizzle } from 'drizzle-orm/better-sqlite3';
import { migrate } from 'drizzle-orm/better-sqlite3/migrator';
import Database from 'better-sqlite3';


class DatabaseService {
    private databases = new Map<string, BetterSQLite3Database>();

    public createConnection(databasePath: string) : BetterSQLite3Database {
        const sqlite = new Database(databasePath);
        return drizzle(sqlite);
    }

    public migrateDatabase(database: BetterSQLite3Database, schemaPath: string) {
        migrate(database, { migrationsFolder: schemaPath });
    }

    public addConnection(key: string, connection: BetterSQLite3Database) {
        this.databases.set(key, connection);
    }

    public getConnection(key: string) {
        return this.databases.get(key);
    }
}


const dbService = new DatabaseService()

export { dbService }