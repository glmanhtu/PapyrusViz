import { dbService } from './database.service';
import { categoryTbl } from '../entities/category';
import { eq } from 'drizzle-orm';

class CategoryService {
	public async getCategories(projectPath: string) {
		const database = dbService.getConnection(projectPath);
		return database.select().from(categoryTbl).orderBy(categoryTbl.name);
	}

	public async setActiveCategory(projectPath: string, categoryId: number) {
		const database = dbService.getConnection(projectPath);
		await database.update(categoryTbl).set({ isActivated: false });
		await database.update(categoryTbl).set({ isActivated: true }).where(eq(categoryTbl.id, categoryId));
	}
}

const categoryService = new CategoryService();
export { categoryService };