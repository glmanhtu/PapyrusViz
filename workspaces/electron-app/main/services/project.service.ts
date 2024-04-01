import * as pathUtils from '../utils/path.utils';

class ProjectService {

	public async projectExists(projectPath: string): Promise<boolean> {
		const projectFile = pathUtils.projectFile(projectPath);
		return await pathUtils.isFile(projectFile);
	}
}

const projectService = new ProjectService();
export { projectService };