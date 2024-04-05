import { sqliteTable, text } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";

export enum Config {
    ACTIVATED_ASSEMBLING_ID = 'activated_assembling_id',
    ACTIVATED_MATCHING_ID = 'activated_matching_id'
}

export const userConfigTbl = sqliteTable('user_config', {
    key: text('key').primaryKey(),
    value: text('value'),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
});


export type UserConfig = typeof userConfigTbl.$inferSelect;