import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { projectTbl } from './project';


export const categoryTbl = sqliteTable('category', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),
    isActivated: integer('is_activated', { mode: 'boolean' }),
    projectId: integer('project_id').references(() => projectTbl.id),
}, (categories) => ({
    pathIdx: index('dir_path_index').on(categories.path),
  })
);

export type Category = typeof categoryTbl.$inferSelect