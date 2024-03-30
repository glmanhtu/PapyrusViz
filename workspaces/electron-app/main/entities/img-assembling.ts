import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { assemblingTbl } from './assembling';
import { imgTbl } from './img';


export const imgAssemblings = sqliteTable('img_assembling', {
    imgId: integer('img_id').references(() => imgTbl.id),
    assemblingId: integer('assembling_id').references(() => assemblingTbl.id),
    transforms: text('transforms', { mode: 'json' }),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.imgId, table.assemblingId]})
    }
})

export type ImgAssembling = typeof imgAssemblings.$inferSelect