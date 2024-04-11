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

import { BaseHandler } from './base.handler';
import { GlobalConfig, IMessage, MatchingMethod, MatchingType, Message, Progress, ProjectDTO } from 'shared-lib';
import { promises as fs } from 'fs';

import { projectTbl } from '../entities/project';
import path from 'node:path';
import { categoryTbl, DefaultCategory } from '../entities/category';
import { eq } from 'drizzle-orm';
import { imgTbl } from '../entities/img';
import * as dataUtils from '../utils/data.utils';
import { takeUniqueOrThrow } from '../utils/data.utils';
import * as pathUtils from '../utils/path.utils';
import { ProjectInfo } from '../models/app-data';
import { dbService } from '../services/database.service';
import { OldProjectModel } from '../models/project';
import { assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { projectService } from '../services/project.service';
import { assemblingService } from '../services/assembling.service';
import { imageService } from '../services/image.service';
import { matchingService } from '../services/matching.service';


declare const global: GlobalConfig;

export class ProjectHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('project::create-project', this.creteProject.bind(this));
		this.addContinuousRoute('project::migrate-project', this.migrateOldProject.bind(this));
		this.addRoute('project:get-projects', this.getProjects.bind(this));
		this.addRoute('project:delete-project', this.deleteProject.bind(this));
		this.addRoute('project:load-project', this.loadProject.bind(this))
	}

	private async getProjects(): Promise<ProjectInfo[]> {
		const {projects} = await dataUtils.readAppData();
		return projects.reverse();
	}

	private async deleteProject(projectPath: string): Promise<void> {
		const appData = await dataUtils.readAppData();
		appData.projects = appData.projects.filter((x) => x.projPath !== projectPath);
		await dataUtils.writeAppData(appData);
		await fs.rm(projectPath, { recursive: true, force: true });
	}

	private async migrateOldProject(projectPath: string, reply: (message: IMessage<string | Progress>) => Promise<void>): Promise<void> {
		const projectFile = path.join(projectPath, 'project.json');
		if (!await pathUtils.isFile(projectFile)) {
			throw new Error('Project does not exists!');
		}
		await reply(Message.success({
			percentage: 1, title: 'Step 1/4 - Migrate project...',
			description: `Converting project files...`
		}));
		const data: OldProjectModel = JSON.parse(await fs.readFile(projectFile, 'utf-8'));

		const databaseFile = pathUtils.projectFile(projectPath)
		const database = dbService.createConnection(databaseFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));
		dbService.addConnection(projectPath, database)

		const project = await database.insert(projectTbl).values({
			name: data.projName,
			path: data.projPath,
			dataPath: data.datasetPath,
			os: process.platform
		}).returning({insertedId: projectTbl.id}).then(takeUniqueOrThrow)


		const categoryMap = new Map<string, number>;
		const rootDirs = [...data.rootDirs.available, { name: DefaultCategory.ARCHIVED, path: ''}];
		await Promise.all(rootDirs.map(async (rootDir) => {
			const category = await database.insert(categoryTbl).values({
				name: rootDir.name,
				path: rootDir.path,
				projectId: project.insertedId,
				isActivated: data.rootDirs.selected === rootDir.path
			}).returning({insertedId: categoryTbl.id}).then(takeUniqueOrThrow)
			categoryMap.set(rootDir.path, category.insertedId);
		}));

		let count = 0;
		const images = Object.entries(data.images);
		for (const [key, oldImg] of images) {
			await Promise.all([...categoryMap].map(async ([rootDir, rootDirID]) => {
				if (oldImg.path.includes(rootDir) && rootDir !== '') {
					await database.insert(imgTbl).values({
						id: parseInt(key) + 1,
						path: path.relative(rootDir, oldImg.path),
						name: oldImg.name,
						thumbnail: path.relative(data.projPath, oldImg.thumbnails),
						width: oldImg.width,
						height: oldImg.height,
						format: oldImg.format,
						categoryId: rootDirID
					});
				}
			}));
			await reply(Message.success({
				percentage: (count + 1) * 50 / images.length, title: 'Step 2/4 - Migrate project...',
				description: `Updating image files...`
			}));
			count += 1;
		}

		count = 0;
		const assemblings = Object.entries(data.assembled);
		for (const [_, assembled] of assemblings) {
			const assembling = await database.insert(assemblingTbl).values({
				name: assembled.name,
				group: assembled.parent,
				projectId: project.insertedId
			}).returning({insertedId: assemblingTbl.id}).then(takeUniqueOrThrow)
			const assemblingId = assembling.insertedId;

			if (assembled.activated) {
				await assemblingService.updateActivatedAssembling(projectPath, assemblingId);
			}

			await Promise.all(Object.entries(assembled.images).map(async ([imgId, imgTransform]) => {
				await database.insert(imgAssemblingTbl).values({
					imgId: parseInt(imgId) + 1,
					assemblingId: assemblingId,
					transforms: imgTransform
				})

			}));

			await reply(Message.success({
				percentage: 50 + (count + 1) * 30 / assemblings.length, title: 'Step 3/4 - Migrate project...',
				description: `Updating assembled files...`
			}));
			count += 1;
		}

		if (data.matching) {
			const matching = await matchingService.createMatching({
				projectPath: projectPath,
				matchingName: data.matching.matchingName,
				matchingType: data.matching.matrixType as MatchingType,
				matchingMethod: data.matching.matchingMethod === 'file' ? MatchingMethod.NAME : MatchingMethod.PATH,
				matchingFile: data.matching.matchingFile
			})
			const nonMappingCols = await matchingService.processSimilarity(projectPath, matching, async (current, total) => {
				await reply(Message.success({
					percentage: 80 + (current) * 20 / total, title: 'Step 4/4 - Migrate project...',
					description: `Updating similarity matrix...`
				}));

			})

			for (const colName of nonMappingCols) {
				await reply(Message.warning(`Unable to find any image that match with column: '${colName}'`))
			}
			await matchingService.setActivatedMatching(projectPath, matching.id);
		} else {
			await reply(Message.success({
				percentage: 100, title: 'Step 4/4 - Migrate project...',
				description: `Update similarity matrix...`
			}));
		}
	}

	private async loadProject(projectPath: string): Promise<ProjectDTO> {
		if (!await projectService.projectExists(projectPath)) {
			throw new Error('Project does not exists!');
		}
		const projectFile = pathUtils.projectFile(projectPath);
		const database = dbService.createConnection(projectFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));
		dbService.addConnection(projectPath, database);

		const projects = await database.select()
			.from(projectTbl);

		// We assume that there will be only one project in this table
		const project = projects[0];
		if (project.path !== projectPath) {
			// This is likely the case when user import existing project
			project.path = projectPath
			await database
				.update(projectTbl)
				.set({
					path: projectPath
				})
				.where(eq(projectTbl.id, project.id));
		}
		if (!await this.getProjects().then((ps) => ps.some(x => x.projPath === projectPath))) {
			await this.addProjectToAppData({projName: project.name, projPath: project.path, datasetPath: project.dataPath});
		}
		return project as ProjectDTO
	}

	private async creteProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => Promise<void> ): Promise<void> {
		const isProjPathExists = await pathUtils.isDir(payload.path)
		const isDSPathExists = await pathUtils.isDir(payload.dataPath);
		if (isProjPathExists && (await fs.readdir(payload.path)).length !== 0) {
			throw new Error(`Project location: ${payload.path} is not empty!`)
		}
		if (!isDSPathExists) {
			throw new Error(`Dataset location: ${payload.dataPath} doesn't exists!`)
		}

		await reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));

		if (!isProjPathExists) {
			await fs.mkdir(payload.path);
		}

		const databaseFile = pathUtils.projectFile(payload.path)
		const database = dbService.createConnection(databaseFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));

		const project = await database.insert(projectTbl).values({
			...payload,
			os: process.platform
		}).returning({insertedId: projectTbl.id}).then(takeUniqueOrThrow)
		const projectId = project.insertedId;

		await reply(Message.success({
			percentage: 5, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));

		const imageMap = await pathUtils.getFilesRecursively(payload.dataPath);
		const nImages: number = [...imageMap.values()].reduce((acc, x) => acc + x.length, 0);
		await reply(Message.success({
			percentage: 10, title: 'Step 2/3 - Collecting images', description: `Collected ${nImages} images...`
		}));

		// Step 3: Generate image thumbnails
		await fs.mkdir(path.join(payload.path, 'thumbnails'));
		let count = 0;
		for (const [rootDir, images] of imageMap) {
			const category = await database.insert(categoryTbl).values({
				name: path.basename(rootDir) || DefaultCategory.ALL_IMAGES,
				path: rootDir,
				projectId: projectId
			}).returning({insertedId: categoryTbl.id}).then(takeUniqueOrThrow)

			for (let i = 0; i < images.length; i++) {
				const thumbnailPath = path.join(payload.path, 'thumbnails', `${count}.jpg`)
				try {
					await imageService.resize(images[i], thumbnailPath, undefined, global.appConfig.thumbnailImgSize);
					const metadata = await imageService.metadata(images[i]);

					const per = (count + 1) * 90 / nImages;
					await reply(Message.success({
						percentage: 10 + per, title: 'Step 3/3 - Generating thumbnails...',
						description: `Generated ${count + 1}/${nImages} thumbnails images...`
					}));
					await database.insert(imgTbl).values({
						...metadata,
						path: path.relative(rootDir, images[i]),
						name: path.basename(images[i]),
						thumbnail: path.relative(payload.path, thumbnailPath),
						categoryId: category.insertedId
					});
				} catch (e) {
					await reply(Message.warning("Unable to read " + images[i] + ', Ignoring...'));
				} finally {
					count += 1;
				}
			}
		}
		// We add an 'Archived' category to store the archived images in the future
		await database.insert(categoryTbl).values({
			name: DefaultCategory.ARCHIVED,
			path: '',
			projectId: projectId
		})
		await assemblingService.createAssembling(payload.path);
		await this.addProjectToAppData({projName: payload.name, projPath: payload.path, datasetPath: payload.dataPath});
	}

	private async addProjectToAppData(project: ProjectInfo) {
		const appData = await dataUtils.readAppData();
		appData.projects.push(project);
		await dataUtils.writeAppData(appData);
	}
}