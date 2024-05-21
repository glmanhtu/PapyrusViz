import { dbService } from './database.service';
import { categoryTbl } from '../entities/category';

class CategoryService {
	public async getCategories(projectPath: string) {
		const database = dbService.getConnection(projectPath);
		return database.select().from(categoryTbl);
	}
}

const categoryService = new CategoryService();
export { categoryService };