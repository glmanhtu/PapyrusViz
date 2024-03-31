import { sqliteTable, text, integer, uniqueIndex } from 'drizzle-orm/sqlite-core';
import { sql } from "drizzle-orm";


export const projectTbl = sqliteTable('project', {
    id: integer('id').primaryKey({autoIncrement: true}),
    name: text('name'),
    path: text('path'),
    dataPath: text('data_path'),
    os: text('os'),
    createdAt: text("created_at").default(sql`CURRENT_TIMESTAMP`)
}, (projects) => ({
    pathIdx: uniqueIndex('proj_path_index').on(projects.path),
  })
);


export type Project = typeof projectTbl.$inferSelect