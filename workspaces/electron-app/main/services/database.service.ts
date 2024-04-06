/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

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