import { sqliteTable, text, integer } from 'drizzle-orm/sqlite-core';
import { projectTbl } from './project';
import { sql } from "drizzle-orm";


export const assemblingTbl = sqliteTable('assembling', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    group: text('group'),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`),
    projectId: integer('project_id').references(() => projectTbl.id),
});


export type Assembling = typeof assemblingTbl.$inferSelect