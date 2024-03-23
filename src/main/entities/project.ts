import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";


export const projects = sqliteTable('project', {
    id: integer('id').primaryKey(),
    name: text('name'),
    path: text('path'),
    dataPath: text('data_path'),
    os: text('os'),
    createdAt: text("createdAt").default(sql`CURRENT_TIMESTAMP`)
}, (projects) => ({
    pathIdx: uniqueIndex('projPathIndex').on(projects.path),
  })
);


export type Project = typeof projects.$inferSelect