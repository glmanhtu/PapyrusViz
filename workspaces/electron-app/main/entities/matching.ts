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

import { sqliteTable, integer, real, index, text, primaryKey } from 'drizzle-orm/sqlite-core';
import { imgTbl } from './img';
import { relations, sql } from 'drizzle-orm';
import { projectTbl } from './project';
import { MatchingMethod } from 'shared-lib';


export const matchingTbl = sqliteTable('matching', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    matrixPath: text('matrix_path'),
    matchingType: text('matching_type'),
    matchingMethod: text('matching_method', {enum: [MatchingMethod.NAME, MatchingMethod.PATH]}),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    projectId: integer('project_id').references(() => projectTbl.id),
}, (table) => {
    return {
        matrixPathIdx: index('matrix_path_index').on(table.matrixPath),
    }
});

export const matchingRecordTbl = sqliteTable('matching-record', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    matchingId: integer('matching_id').references(() => matchingTbl.id),
});

export const matchingRecordScoreTbl = sqliteTable('matching-record-score', {
    sourceId: integer('source_id').notNull().references(() => matchingRecordTbl.id),
    targetId: integer('target_id').notNull().references(() => matchingRecordTbl.id),
    score: real('score'),
    rank: integer('rank'),
    matchingId: integer('matching_id').references(() => matchingTbl.id),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.sourceId, table.targetId]})
    }
});


export const matchingImgRecordTbl = sqliteTable('matching-img-record', {
    imgId: integer('img_id').notNull().references(() => imgTbl.id),
    matchingRecordId: integer('matching_record_id').notNull().references(() => matchingRecordTbl.id),
    matchingId: integer('matching_id').references(() => matchingTbl.id),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.imgId, table.matchingRecordId]})
    }
});

export const matchingTblRelations = relations(matchingTbl, ({ many }) => ({
    matchingRecord: many(matchingRecordTbl)
}));

export const matchingImgRelations = relations(imgTbl, ({ many }) => ({
    matchingImgRecord: many(matchingImgRecordTbl)
}));

export const matchingRecordRelations = relations(matchingRecordTbl, ({ many }) => ({
    matchingRecordScore: many(matchingRecordScoreTbl),
    matchingRecordImage: many(matchingImgRecordTbl)
}));

export const matchingRecordScoreRelations = relations(matchingRecordScoreTbl, ({ one }) => ({
    source: one(matchingRecordTbl, {
        fields: [matchingRecordScoreTbl.sourceId],
        references: [matchingRecordTbl.id],
    }),

    target: one(matchingRecordTbl, {
        fields: [matchingRecordScoreTbl.targetId],
        references: [matchingRecordTbl.id],
    })
}));

export const matchingImgRecordTblRelations = relations(matchingImgRecordTbl, ({ one }) => ({
    img: one(imgTbl, {
        fields: [matchingImgRecordTbl.imgId],
        references: [imgTbl.id],
    }),
    matchingRecord: one(matchingRecordTbl, {
        fields: [matchingImgRecordTbl.matchingRecordId],
        references: [matchingRecordTbl.id],
    })
}));


export type MatchingRecord = typeof matchingRecordTbl.$inferSelect
export type MatchingImgRecord = typeof matchingImgRecordTbl.$inferSelect
export type MatchingRecordScore = typeof matchingRecordScoreTbl.$inferSelect
export type Matching = typeof matchingTbl.$inferSelect