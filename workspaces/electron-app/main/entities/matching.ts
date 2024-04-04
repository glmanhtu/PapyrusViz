import { sqliteTable, integer, real, index, text } from 'drizzle-orm/sqlite-core';
import { imgTbl } from './img';
import { sql } from 'drizzle-orm';
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
    sourceImgId: integer('source_img_id').references(() => imgTbl.id),
    targetImgId: integer('target_img_id').references(() => imgTbl.id),
    score: real('score'),
    matchingId: integer('matching_id').references(() => matchingTbl.id)
}, (table) => {
    return {
        srcIdx: index('matching_src_index').on(table.sourceImgId),
        targetIdx: index('matching_target_index').on(table.targetImgId),
    }
});


export type MatchingImg = typeof matchingImgTbl.$inferSelect