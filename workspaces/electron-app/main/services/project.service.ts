import * as pathUtils from '../utils/path.utils';
import { Project, projectTbl } from '../entities/project';
import { dbService } from './database.service';
import { eq } from 'drizzle-orm';
import { takeUniqueOrThrow } from '../utils/data.utils';

class ProjectService {

	public async projectExists(projectPath: string): Promise<boolean> {
		const projectFile = pathUtils.projectFile(projectPath);
		return await pathUtils.isFile(projectFile);
	}

	public async getProjectByPath(projectPath: string): Promise<Project> {
		const database = dbService.getConnection(projectPath);
		return database.select()
			.from(projectTbl).where(eq(projectTbl.path, projectPath)).then(takeUniqueOrThrow);
	}
}

const projectService = new ProjectService();
export { projectService };