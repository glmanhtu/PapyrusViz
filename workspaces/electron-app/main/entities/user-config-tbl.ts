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