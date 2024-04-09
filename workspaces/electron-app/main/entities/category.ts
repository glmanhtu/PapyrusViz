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

import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { projectTbl } from './project';
import { relations } from 'drizzle-orm';
import { imgTbl } from './img';


export const categoryTbl = sqliteTable('category', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),
    isActivated: integer('is_activated', { mode: 'boolean' }),
    projectId: integer('project_id').references(() => projectTbl.id),
}, (categories) => ({
    pathIdx: index('dir_path_index').on(categories.path),
  })
);

export const categoryRelations = relations(categoryTbl, ({ many }) => ({
    imgs: many(imgTbl),
}));

export type Category = typeof categoryTbl.$inferSelect