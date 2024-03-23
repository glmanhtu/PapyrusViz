import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { projects } from './project';


export const dirs = sqliteTable('dir', {
    id: integer('id').primaryKey(),
    name: text('name'),
    path: text('path'),
    projectId: integer('project_id').references(() => projects.id),
}, (dirs) => ({
    pathIdx: uniqueIndex('dirPathIndex').on(dirs.path),
  })
);

export type Dirs = typeof dirs.$inferSelect