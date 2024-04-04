import { BaseHandler } from "./base.handler";

import { categoryTbl } from '../entities/category';
import { CategoryDTO, CategoryRequest } from 'shared-lib';
import { dbService } from '../services/database.service';
import { eq } from 'drizzle-orm';
import { takeUniqueOrThrow } from '../utils/data.utils';
import path from 'node:path';

export class CategoryHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('category:get-categories', this.getCategories.bind(this))
		this.addRoute('category:get-category', this.getCategory.bind(this))
	}

	private async getCategories(projectPath: string): Promise<CategoryDTO[]> {
		const database = dbService.getConnection(projectPath);
		return database.select().from(categoryTbl);
	}

	private async getCategory(payload: CategoryRequest): Promise<CategoryDTO> {
		const database = dbService.getConnection(payload.projectPath);
		return database.select().from(categoryTbl).where(eq(categoryTbl.id, payload.categoryId))
			.then(takeUniqueOrThrow).then((x) => ({...x, path: x.path + path.sep}))
	}
}