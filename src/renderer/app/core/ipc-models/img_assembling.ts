import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { assemblings } from './assembling';
import { imgs } from './img';


export const imgAssemblings = sqliteTable('img_assembling', {
    id: integer('id').primaryKey(),
    transforms: text('transforms', { mode: 'json' }),
    imgId: integer('img_id').references(() => imgs.id),
    assemblingId: integer('assembling_id').references(() => assemblings.id),
})

export type ImgAssembling = typeof imgAssemblings.$inferSelect