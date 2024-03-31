import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { categoryTbl } from './category';


export const imgTbl = sqliteTable('img', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),     // relative path with respect to dirId
    thumbnail: text('thumbnail'),
    width: integer('width'),
    height: integer('height'),
    format: text('format'),
    categoryId: integer('dir_id').references(() => categoryTbl.id),
}, (table) => {
  return {
    pathIdx: index("imgPathIdx").on(table.path),
  };  
});


export type Img = typeof imgTbl.$inferSelect