import { sqliteTable, text, integer, index } from 'drizzle-orm/sqlite-core';
import { projects } from './project';


export const categories = sqliteTable('category', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),
    projectId: integer('project_id').references(() => projects.id),
}, (categories) => ({
    pathIdx: index('dirPathIndex').on(categories.path),
  })
);

export type Category = typeof categories.$inferSelect