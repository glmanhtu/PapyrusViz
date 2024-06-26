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
import { SegmentationPoint } from 'shared-lib';

export enum ImgStatus {
  ONLINE = 1,
  ARCHIVED = 2
}

export const imgTbl = sqliteTable('img', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),     // relative path with respect to dirId
    fragment: text('fragment').default(''), // Segmented fragment
    width: integer('width'),
    height: integer('height'),
    status: integer('status').default(ImgStatus.ONLINE),
    format: text('format'),
    segmentationPoints: text('segmentation-points', { mode: 'json' }).default(JSON.stringify([])).$type<SegmentationPoint[]>(),
    categoryId: integer('dir_id').references(() => categoryTbl.id),
}, (table) => {
  return {
    pathIdx: index("img_path_idx").on(table.path),
    statusIdx: index("img_status_idx").on(table.status),
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