import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { categories } from './category';


export const imgs = sqliteTable('img', {
    id: integer('id').primaryKey(),
    name: text('name'),
    path: text('path'),     // relative path with respect to dirId
    thumbnail: text('thumbnail'),
    width: integer('width'),
    height: integer('height'),
    format: text('format'),
    size: integer('size'),
    dirId: integer('dir_id').references(() => categories.id),
}, (table) => {
  return {
    pathIdx: index("imgPathIdx").on(table.path),
  };  
});


export type Img = typeof imgs.$inferSelect