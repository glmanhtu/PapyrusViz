import { BaseHandler } from "./base.handler";

import { categoryTbl } from '../entities/category';
import { CategoryDTO } from 'shared-lib';
import { dbService } from '../services/database.service';

export class CategoryHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute<string, CategoryDTO>('category:get-categories', this.getCategories.bind(this))
	}

	private async getCategories(projectPath: string): Promise<CategoryDTO[]> {
		const database = dbService.getConnection(projectPath);
		const categories = await database.select().from(categoryTbl);
		return categories.map((x) => {
			return { id: x.id, name: x.name, isActivated: x.isActivated }
		});
	}
}