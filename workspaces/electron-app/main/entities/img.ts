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
import { categoryTbl } from './category';
import { relations } from 'drizzle-orm';


export const imgTbl = sqliteTable('img', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),     // relative path with respect to dirId
    thumbnail: text('thumbnail'),
    width: integer('width'),
    height: integer('height'),
    format: text('format'),
    categoryId: integer('dir_id').references(() => categoryTbl.id),
}, (table) => {
  return {
    pathIdx: index("img_path_idx").on(table.path),
    nameIdx: index("img_name_idx").on(table.name),
  };
});

export const imgRelations = relations(imgTbl, ({ one }) => ({
  category: one(categoryTbl, {
    fields: [imgTbl.categoryId],
    references: [categoryTbl.id],
  }),
}));

export type Img = typeof imgTbl.$inferSelect