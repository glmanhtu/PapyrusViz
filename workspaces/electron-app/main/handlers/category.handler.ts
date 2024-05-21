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

import { BaseHandler } from "./base.handler";

import { categoryTbl } from '../entities/category';
import { CategoryDTO, CategoryRequest } from 'shared-lib';
import { dbService } from '../services/database.service';
import { eq } from 'drizzle-orm';
import { takeUniqueOrThrow } from '../utils/data.utils';
import path from 'node:path';
import { categoryService } from '../services/category.service';

export class CategoryHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('category:get-categories', this.getCategories.bind(this))
		this.addRoute('category:get-category', this.getCategory.bind(this))
	}

	private async getCategories(projectPath: string): Promise<CategoryDTO[]> {
		return categoryService.getCategories(projectPath)
	}

	private async getCategory(payload: CategoryRequest): Promise<CategoryDTO> {
		const database = dbService.getConnection(payload.projectPath);
		return database.select().from(categoryTbl).where(eq(categoryTbl.id, payload.categoryId))
			.then(takeUniqueOrThrow).then((x) => ({...x, path: x.path + path.sep}))
	}
}