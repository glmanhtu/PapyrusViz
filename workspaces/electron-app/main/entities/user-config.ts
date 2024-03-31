import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";


export const userConfig = sqliteTable('user_config', {
    id: integer('id').primaryKey({autoIncrement: true}),
    key: text('key'),
    value: text('value'),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});


export type UserConfig = typeof userConfig.$inferSelect