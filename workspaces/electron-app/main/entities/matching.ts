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

import { sqliteTable, integer, real, index, text } from 'drizzle-orm/sqlite-core';
import { imgTbl } from './img';
import { relations, sql } from 'drizzle-orm';
import { projectTbl } from './project';


export const matchingTbl = sqliteTable('matching', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    matrixPath: text('matrix_path'),
    matchingType: text('matching_type'),
    matchingMethod: text('matching_method'),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    projectId: integer('project_id').references(() => projectTbl.id),
}, (table) => {
    return {
        matrixPathIdx: index('matrix_path_index').on(table.matrixPath),
    }
});


export const matchingImgTbl = sqliteTable('matching-img', {
    id: integer('id').primaryKey({autoIncrement: true}),
    sourceImgId: integer('source_img_id').notNull().references(() => imgTbl.id),
    targetImgId: integer('target_img_id').notNull().references(() => imgTbl.id),
    score: real('score'),
    matchingId: integer('matching_id').references(() => matchingTbl.id)
}, (table) => {
    return {
        srcIdx: index('matching_src_index').on(table.sourceImgId),
        targetIdx: index('matching_target_index').on(table.targetImgId),
    }
});

export const matchingTblRelations = relations(matchingTbl, ({ many }) => ({
    matchingImgTbl: many(matchingImgTbl)
}));

export const matchingImgRelations = relations(imgTbl, ({ many }) => ({
    matchingImgTbl: many(matchingImgTbl)
}));

export const imgToMatchingRelations = relations(matchingImgTbl, ({ one }) => ({
    matching: one(matchingTbl, {
        fields: [matchingImgTbl.matchingId],
        references: [matchingTbl.id],
    }),
    sourceImg: one(imgTbl, {
        fields: [matchingImgTbl.sourceImgId],
        references: [imgTbl.id],
    }),
    targetImg: one(imgTbl, {
        fields: [matchingImgTbl.targetImgId],
        references: [imgTbl.id],
    }),
}));


export type MatchingImg = typeof matchingImgTbl.$inferSelect