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
import {
	IMessage,
	MatchingMethod,
	MatchingType,
	Message,
	Progress,
	ProjectDTO,
	ProjectInfo,
} from 'shared-lib';
import { promises as fs } from 'fs';

import { projectTbl } from '../entities/project';
import path from 'node:path';
import { Category, categoryTbl, DefaultCategory } from '../entities/category';
import { eq } from 'drizzle-orm';
import { Img, imgTbl } from '../entities/img';
import * as dataUtils from '../utils/data.utils';
import { takeUniqueOrThrow } from '../utils/data.utils';
import * as pathUtils from '../utils/path.utils';
import { dbService } from '../services/database.service';
import { OldProjectModel } from '../models/project';
import { assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { projectService } from '../services/project.service';
import { assemblingService } from '../services/assembling.service';
import { imageService } from '../services/image.service';
import { matchingService } from '../services/matching.service';
import { Logger } from '../utils/logger';


export class ProjectHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('project::create-project', this.creteProject.bind(this));
		this.addContinuousRoute('project::migrate-project', this.migrateOldProject.bind(this));
		this.addContinuousRoute('project::reconfigure-project', this.reconfigureProject.bind(this))
		this.addRoute('project:get-projects', this.getProjects.bind(this));
		this.addRoute('project:delete-project', this.deleteProject.bind(this));
		this.addRoute('project:load-project', this.loadProject.bind(this))
		this.addRoute('project:project-info', this.getProjectInfo.bind(this))
	}

	private async getProjects(): Promise<ProjectInfo[]> {
		const {projects} = await dataUtils.readAppData();
		return projects.reverse();
	}

	private async deleteProject(projectPath: string): Promise<void> {
		const appData = await dataUtils.readAppData();
		appData.projects = appData.projects.filter((x) => x.projPath !== projectPath);
		await dataUtils.writeAppData(appData);
		const option = { recursive: true, force: true }
		await fs.rm(projectPath, option);
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
			if (rootDir.name !== DefaultCategory.ARCHIVED) {
				categoryMap.set(rootDir.path, category.insertedId);
			}
		}));

		const categories = Array.from(categoryMap, ([name, value]) => ({ name, value }));
		const sortedCategories = categories.sort(function(a, b) {
			var x = a["name"]; var y = b["name"];
			return ((x > y) ? -1 : ((x < y) ? 1 : 0));
		})

		let count = 0;
		const images = Object.entries(data.images);
		for (const [key, oldImg] of images) {
			for (const item of sortedCategories) {
				const rootDir = item["name"];
				const rootDirID = item["value"];
				if (oldImg.path.includes(rootDir)) {
					const thumbnailPath = imageService.resolveThumbnailFromImgPath(oldImg.path);
					await fs.mkdir(path.dirname(thumbnailPath), {recursive: true});
					await fs.copyFile(oldImg.thumbnails, thumbnailPath);
					await database.insert(imgTbl).values({
						id: parseInt(key) + 1,
						path: rootDir === "" ? oldImg.path : path.relative(rootDir, oldImg.path),
						name: oldImg.name.split('.')[0],
						width: oldImg.width,
						height: oldImg.height,
						format: oldImg.format,
						categoryId: rootDirID,
						segmentationPoints: []
					});
					break;
				}
			}
			count += 1;
			await reply(Message.success({
				percentage: count * 50 / images.length, title: 'Step 2/4 - Migrate project...',
				description: `Updating image files ${count}/${images.length}...`
			}));
		}

		count = 0;
		const assemblings = Object.entries(data.assembled);
		for (const [_, assembled] of assemblings) {
			const assembling = await database.insert(assemblingTbl).values({
				name: assembled.name,
				group: assembled.parent,
				projectId: project.insertedId,
				transforms: {
					origin: {
						x: 0,
						y: 0
					},
					scale: 1,
					last: {
						x: 0,
						y: 0
					}
				}
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

			count += 1;
			await reply(Message.success({
				percentage: 50 + count * 30 / assemblings.length, title: 'Step 3/4 - Migrate project...',
				description: `Updating assembled files ${count}/${assemblings.length}...`
			}));
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
					description: `Updating similarity matrix ${current}/${total}...`
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

	private async getProjectInfo(projectPath: string): Promise<ProjectDTO> {
		if (!await projectService.projectExists(projectPath)) {
			throw new Error('Project does not exists!');
		}
		const projectFile = pathUtils.projectFile(projectPath);
		const database = dbService.createConnection(projectFile);

		const projects = await database.select()
			.from(projectTbl);

		// We assume that there will be only one project in this table
		const project = projects[0];
		return project as ProjectDTO;
	}

	private async loadProject(projectPath: string): Promise<ProjectDTO> {
		if (!await projectService.projectExists(projectPath)) {
			throw new Error('Project does not exists!');
		}
		const projectFile = pathUtils.projectFile(projectPath);
		const database = dbService.createConnection(projectFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));
		dbService.addConnection(projectPath, database);

		// We assume that there will be only one project in this table
		const project = await projectService.getProjectByPath(projectPath);
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

		if (! await projectService.projectDataValid(projectPath)) {
			throw new Error('Project data is invalid!')	;
		}
		return project as ProjectDTO
	}


	private async reconfigureProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => Promise<void> ): Promise<void> {
		const isDSPathExists = await pathUtils.isDir(payload.dataPath);
		if (!isDSPathExists) {
			throw new Error(`Dataset location: ${payload.dataPath} doesn't exists!`)
		}

		Logger.info('Trying to reconfigure project ', payload);

		await reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Verifying project', description: ''
		}));

		const databaseFile = pathUtils.projectFile(payload.path)
		const database = dbService.createConnection(databaseFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));
		dbService.addConnection(payload.path, database)

		await reply(Message.success({
			percentage: 5, title: 'Step 2/3 - Collecting images', description: 'Scanning images in the provided dataset...'
		}));

		const project = await projectService.getProjectByPath(payload.path);

		const imageMap = await pathUtils.getFilesRecursively(payload.dataPath);
		const dirNameMap = new Map<string, string>();
		for (const [rootDir, _] of imageMap) {
			if (rootDir !== '') {
				dirNameMap.set(path.basename(rootDir), rootDir);
			}
		}

		const images = await database.select().from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id));

		const updateImgInfo = async (img: Img, category: Category, newCategoryPath: string, newImgPath: string) => {
			await imageService.updateThumbnail(img, category, newImgPath);
			const oldSegmentationImg = pathUtils.segmentationPath(category, img);
			img.path = newCategoryPath === '' ? newImgPath : path.relative(newCategoryPath, newImgPath);
			category.path = newCategoryPath
			await database.update(categoryTbl).set({path: newCategoryPath}).where(eq(categoryTbl.id, category.id));
			await database.update(imgTbl).set({path: img.path}).where(eq(imgTbl.id, img.id));
			await imageService.updateSegmentedImg(img, category, oldSegmentationImg);
		}

		const imgMatched = [];
		const imgUnMatched = [];
		let count = 0;
		for (const imgInfo of images) {
			if (imgInfo.category.path === '') {
				const imgDisk = imageMap.get('');
				if (imgDisk) {
					const rootPath = path.dirname(imgDisk[0]);
					const newImgPath = path.join(rootPath, path.basename(imgInfo.img.path));
					if (pathUtils.exists(newImgPath)) {
						await updateImgInfo(imgInfo.img, imgInfo.category, '', newImgPath);
						imgMatched.push(imgInfo);
					} else {
						Logger.error("Unable to remap " + imgInfo.img.path + ', Ignoring...')
						imgUnMatched.push(imgInfo);
						await reply(Message.warning("Unable to remap " + imgInfo.img.path + ', Ignoring...'));
					}
				} else {
					throw new Error('The chosen image dataset doesn\'t seems to match with the one in the project! ');
				}
			} else {
				const rootName = path.basename(imgInfo.category.path);
				const newPath = dirNameMap.get(rootName);
				if (!newPath) {
					throw new Error('The chosen image dataset doesn\'t seems to match with the one in the project! ');
				}
				const newImgPath = path.join(newPath, pathUtils.convertPath(imgInfo.img.path, project.os));
				if (pathUtils.exists(newImgPath)) {
					await updateImgInfo(imgInfo.img, imgInfo.category, newPath, newImgPath);
					imgMatched.push(imgInfo);
				} else {
					Logger.error("Unable to remap " + imgInfo.img.path + ', Ignoring...')
					imgUnMatched.push(imgInfo);
					await reply(Message.warning("Unable to remap " + imgInfo.img.path + ', Ignoring...'));
				}
			}

			if (imgUnMatched.length / images.length > 0.5) {
				throw new Error('Too many error occurred. Stopping...');
			}

			const per = (count + 1) * 95 / images.length;
			await reply(Message.success({
				percentage: 5 + per, title: 'Step 3/3 - Update images...',
				description: `Reconfigured ${imgMatched.length}/${images.length} images...`
			}));
			count += 1;
		}

		const appData = await dataUtils.readAppData();
		let found = false;
		for (let i = 0; i < appData.projects.length; i++) {
			if (appData.projects[i].projPath === payload.path) {
				appData.projects[i].datasetPath = payload.dataPath;
				appData.projects[i].projName = payload.name;
				found = true;
				break;
			}
		}
		if (!found) {
			appData.projects.push({projName: payload.name, projPath: payload.path, datasetPath: payload.dataPath});
		}

		Logger.info('Project is reconfigured!');
		await dataUtils.writeAppData(appData);
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
		dbService.addConnection(payload.path, database)

		const project = await database.insert(projectTbl).values({
			...payload,
			os: process.platform
		}).returning({insertedId: projectTbl.id}).then(takeUniqueOrThrow)
		const projectId = project.insertedId;

		await reply(Message.success({
			percentage: 5, title: 'Step 2/3 - Collecting images', description: 'Scanning images in the provided dataset...'
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
				try {
					await imageService.generateThumbnail(images[i]);
					const metadata = await imageService.metadata(images[i]);

					const per = (count + 1) * 90 / nImages;
					await reply(Message.success({
						percentage: 10 + per, title: 'Step 3/3 - Generating thumbnails...',
						description: `Generated ${count + 1}/${nImages} thumbnails images...`
					}));
					await database.insert(imgTbl).values({
						...metadata,
						path: rootDir === "" ? images[i] : path.relative(rootDir, images[i]),
						name: path.basename(images[i]).split('.')[0],
						segmentationPoints: [],
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