import { BaseHandler } from "./base.handler";

import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { categoryTbl } from '../entities/category';
import { CategoryDTO } from 'shared-lib';

export class CategoryHandler extends BaseHandler {
	constructor(private databases: Map<string, BetterSQLite3Database>) {
		super();
		this.addRoute<string, CategoryDTO>('category:get-categories', this.getCategories.bind(this))
	}

	private async getCategories(projectPath: string): Promise<CategoryDTO[]> {
		const database = this.databases.get(projectPath);
		const categories = await database.select().from(categoryTbl);
		return categories.map((x) => {
			return { id: x.id, name: x.name, isActivated: x.isActivated }
		});
	}
}