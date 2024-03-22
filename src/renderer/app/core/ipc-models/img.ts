import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { dirs } from './dir';


export const imgs = sqliteTable('img', {
    id: integer('id').primaryKey(),
    name: text('name'),
    path: text('path'),
    thumbnail: text('thumbnail'),
    width: integer('width'),
    height: integer('height'),
    format: text('format'),
    size: integer('size'),
    dirId: integer('dir_id').references(() => dirs.id),
})


export type Img = typeof imgs.$inferSelect