import { BaseHandler } from "./base.handler";
import { GlobalConfig, IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
import { promises as fs } from 'fs';

import { projectTbl } from '../entities/project';
import path from 'node:path';
import { categoryTbl } from '../entities/category';
import { eq } from 'drizzle-orm';
import { imgTbl } from '../entities/img';
import * as dataUtils from '../utils/data.utils';
import * as pathUtils from '../utils/path.utils';
import sharp from 'sharp'
import { ProjectInfo } from '../models/app-data';
import { dbService } from '../services/database.service';
import { OldProjectModel } from '../models/project';
import { assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { projectService } from '../services/project.service';
import { assemblingService } from '../services/assembling.service';


declare const global: GlobalConfig;

export class ProjectHandler extends BaseHandler {
	constructor() {
		super();
		this.addContinuousRoute('project::create-project', this.creteProject.bind(this));
		this.addRoute('project:get-projects', this.getProjects.bind(this));
		this.addRoute('project:load-project', this.loadProject.bind(this))
	}

	private async getProjects(): Promise<ProjectInfo[]> {
		const {projects} = await dataUtils.readAppData();
		return projects.reverse();
	}

	private async migrateOldProject(projectPath: string): Promise<void> {
		const projectFile = path.join(projectPath, 'project.json');
		const data: OldProjectModel = JSON.parse(await fs.readFile(projectFile, 'utf-8'));

		const databaseFile = pathUtils.projectFile(projectPath)
		const database = dbService.createConnection(databaseFile);
		dbService.migrateDatabase(database, path.join(__dirname, 'schema'));
		dbService.addConnection(projectPath, database)

		const result = await database.insert(projectTbl).values({
			name: data.projName,
			path: data.projPath,
			dataPath: data.datasetPath,
			os: process.platform
		}).returning({insertedId: projectTbl.id});
		const projectId = result[0].insertedId;


		const categoryMap = new Map<string, number>;
		await Promise.all(data.rootDirs.available.map(async (rootDir) => {
			const categories = await database.insert(categoryTbl).values({
				name: rootDir.name,
				path: rootDir.path,
				projectId: projectId,
				isActivated: data.rootDirs.selected === rootDir.path
			}).returning({insertedId: categoryTbl.id});
			categoryMap.set(rootDir.path, categories[0].insertedId);
		}));

		await Promise.all(Object.entries(data.images).map(async ([key, oldImg]) => {
			await Promise.all([...categoryMap].map(async ([rootDir, rootDirID]) => {
				if (oldImg.path.includes(rootDir) && rootDir !== '') {
					await database.insert(imgTbl).values({
						id: parseInt(key),
						path: path.relative(rootDir, oldImg.path),
						name: oldImg.name,
						thumbnail: path.relative(data.projPath, oldImg.thumbnails),
						width: oldImg.width,
						height: oldImg.height,
						format: oldImg.format,
						categoryId: rootDirID
					});
				}
			}))
		}));

		await Promise.all(Object.entries(data.assembled).map(async ([_, assembled]) => {
			const assemblings = await database.insert(assemblingTbl).values({
				name: assembled.name,
				group: assembled.parent,
				imgCount: assembled.imagesCount,
				projectId: projectId
			}).returning({insertedId: assemblingTbl.id});
			const assemblingId = assemblings[0].insertedId;

			if (assembled.activated) {
				await assemblingService.updateActivatedAssembling(projectPath, assemblingId);
			}

			await Promise.all(Object.entries(assembled.images).map(async ([imgId, imgTransform]) => {
				await database.insert(imgAssemblingTbl).values({
					imgId: parseInt(imgId),
					assemblingId: assemblingId,
					transforms: imgTransform
				})

			}))
		}));
	}

	private async loadProject(projectPath: string): Promise<ProjectDTO> {
		if (!await projectService.projectExists(projectPath)) {
			if (await pathUtils.isFile(path.join(projectPath, 'project.json'))) {
				await this.migrateOldProject(projectPath);
			} else {
				throw new Error('Project does not exists!');
			}
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

		const result = await database.insert(projectTbl).values({
			...payload,
			os: process.platform
		}).returning({insertedId: projectTbl.id});
		const projectId = result[0].insertedId;

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
				name: path.basename(rootDir) || 'All images',
				path: rootDir,
				projectId: projectId
			}).returning({insertedId: categoryTbl.id});

			for (let i = 0; i < images.length; i++) {
				const thumbnailPath = path.join(payload.path, 'thumbnails', `${count}.jpg`)
				const image = sharp(images[i]);
				try {
					await image
						.resize({ height: global.appConfig.thumbnailImgSize })
						.flatten({ background: { r: 255, g: 255, b: 255 } })
						.toFile(thumbnailPath);
					const metadata = await image.metadata();

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
						categoryId: category[0].insertedId
					});
				} catch (e) {
					await reply(Message.warning("Unable to read " + images[i] + ', Ignoring...'));
				} finally {
					count += 1;
				}
			}
		}

		const appData = await dataUtils.readAppData();
		appData.projects.push({projName: payload.name, projPath: payload.path, datasetPath: payload.dataPath});
		await dataUtils.writeAppData(appData);
	}
}