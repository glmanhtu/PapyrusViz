/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import { sqliteTable, text, integer, primaryKey } from 'drizzle-orm/sqlite-core';
import { assemblingTbl } from './assembling';
import { imgTbl } from './img';
import { relations } from 'drizzle-orm';


export const imgAssemblingTbl = sqliteTable('img_assembling', {
    imgId: integer('img_id').references(() => imgTbl.id),
    assemblingId: integer('assembling_id').references(() => assemblingTbl.id),
    transforms: text('transforms', { mode: 'json' }),
}, (table) => {
    return {
        pk: primaryKey({columns: [table.imgId, table.assemblingId]})
    }
})

export const assemblingTblRelations = relations(assemblingTbl, ({ many }) => ({
    imgAssemblingTbl: many(imgAssemblingTbl)
}));

export const assemblingImgRelations = relations(imgTbl, ({ many }) => ({
    imgAssemblingTbl: many(imgAssemblingTbl)
}));

export const imgToAssemblingRelations = relations(imgAssemblingTbl, ({ one }) => ({
    assembling: one(assemblingTbl, {
        fields: [imgAssemblingTbl.assemblingId],
        references: [assemblingTbl.id],
    }),
    img: one(imgTbl, {
        fields: [imgAssemblingTbl.imgId],
        references: [imgTbl.id],
    })
}));

export type ImgAssembling = typeof imgAssemblingTbl.$inferSelect