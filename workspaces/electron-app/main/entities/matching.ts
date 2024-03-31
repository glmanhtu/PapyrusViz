import { sqliteTable, integer, real, primaryKey } from 'drizzle-orm/sqlite-core';
import { imgTbl } from './img';


export const matchingTbl = sqliteTable('matching', {
    sourceImgId: integer('source_img_id').references(() => imgTbl.id),
    targetImgId: integer('target_img_id').references(() => imgTbl.id),
    score: real('score'),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.sourceImgId, table.targetImgId]})
    }
});


export type Matching = typeof matchingTbl.$inferSelect