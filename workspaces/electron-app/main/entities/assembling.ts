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

import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projectTbl } from './project';
import { sql } from "drizzle-orm";
import { GlobalTransform } from 'shared-lib';

export enum AssemblingStatus {
    ENABLED = 1,
    CLOSED = 2
}

export const assemblingTbl = sqliteTable('assembling', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    group: text('group'),
    status: integer('status').default(AssemblingStatus.ENABLED),
    transforms: text('transforms', { mode: 'json' }).$type<GlobalTransform>(),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    projectId: integer('project_id').references(() => projectTbl.id),
});


export type Assembling = typeof assemblingTbl.$inferSelect