import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projects } from './project';
import { sql } from "drizzle-orm";


export const assemblings = sqliteTable('assembling', {
    id: integer('id').primaryKey(),
    name: text('name'),
    group: text('group'),
    isActivated: integer('is_activated', { mode: 'boolean' }),
    imgCount: integer('img_count'),
    createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`),
    projectId: integer('project_id').references(() => projects.id),
});


export type Assembling = typeof assemblings.$inferSelect