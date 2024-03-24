import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { assemblings } from './assembling';
import { imgs } from './img';


export const imgAssemblings = sqliteTable('img_assembling', {
    imgId: integer('img_id').references(() => imgs.id),
    assemblingId: integer('assembling_id').references(() => assemblings.id),
    transforms: text('transforms', { mode: 'json' }),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.imgId, table.assemblingId]})
    }
})

export type ImgAssembling = typeof imgAssemblings.$inferSelect