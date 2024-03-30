import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { projectTbl } from './project';


export const categoryTbl = sqliteTable('category', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),
    projectId: integer('project_id').references(() => projectTbl.id),
}, (categories) => ({
    pathIdx: index('dirPathIndex').on(categories.path),
  })
);

export type Category = typeof categoryTbl.$inferSelect