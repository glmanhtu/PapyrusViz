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