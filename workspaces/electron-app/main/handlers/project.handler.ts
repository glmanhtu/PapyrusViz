import { BaseHandler } from "./base.handler";
import { GlobalConfig, IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
import { promises as fs } from 'fs';

import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { projectTbl } from '../entities/project';
import path from 'node:path';
import { categoryTbl } from '../entities/category';
import { eq } from 'drizzle-orm';
import { imgTbl } from '../entities/img';
import * as dataUtils from '../utils/data.utils';
import * as pathUtils from '../utils/path.utils';
import sharp from 'sharp'
import { ProjectInfo } from '../models/app-data';
import * as databaseUtils from '../utils/database.utils';

declare const global: GlobalConfig;

export class ProjectHandler extends BaseHandler {
	constructor(private databases: Map<string, BetterSQLite3Database>) {
		super();
		this.addContinuousHandler<ProjectDTO, Progress>('project::create-project', this.creteProject.bind(this));
		this.addRoute<void, ProjectInfo[]>('project:get-projects', this.getProjects.bind(this));
		this.addRoute<string, ProjectDTO>('project:load-project', this.loadProject.bind(this))
	}

	private async getProjects(): Promise<ProjectInfo[]> {
		const {projects} = await dataUtils.readAppData();
		return projects;
	}

	private async projectExists(projectPath: string): Promise<boolean> {
		const projectFile = pathUtils.projectFile(projectPath);
		return await pathUtils.isFile(projectFile);
	}

	private async loadProject(projectPath: string): Promise<ProjectDTO> {
		if (!await this.projectExists(projectPath)) {
			throw new Error('Project does not exists!');
		}
		const projectFile = pathUtils.projectFile(projectPath);
		const database = databaseUtils.createConnection(projectFile);
		databaseUtils.migrateDatabase(database, path.join(__dirname, 'schema'));
		this.databases.set(projectPath, database);

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
		const database = databaseUtils.createConnection(databaseFile);
		databaseUtils.migrateDatabase(database, path.join(__dirname, 'schema'));

		const result = await database.insert(projectTbl).values({
			name: payload.name,
			path: payload.path,
			dataPath: payload.dataPath,
			os: process.platform
		}).returning({insertedId: projectTbl.id});
		const projectId = result[0].insertedId;

		await reply(Message.success({
			percentage: 10, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));

		// Step 2: Get image files
		const category = await database.insert(categoryTbl).values({
			name: 'All images',
			path: '',
			projectId: projectId
		}).returning({insertedId: categoryTbl.id});
		const categoryId = category[0].insertedId;

		const imageMap = new Map<number, string[]>();
		const getFilesRecursively = async (directory: string, categoryId: number, level = 0): Promise<void> => {
			const filesInDirectory = await fs.readdir(directory);
			for (let i = 0; i < filesInDirectory.length; i++) {
				const absolute = path.join(directory, filesInDirectory[i]);
				let currentDirectoryId = categoryId;
				if ((await fs.stat(absolute)).isDirectory()) {
					if (level === 0) {
						const category = await database.insert(categoryTbl).values({
							name: filesInDirectory[i],
							path: absolute,
							projectId: projectId
						}).returning({insertedId: categoryTbl.id});
						currentDirectoryId = category[0].insertedId;
					}
					await getFilesRecursively(absolute, currentDirectoryId, level + 1);
				} else {
					const fileExt = absolute.split('.').pop().toLowerCase();
					if (['jpg', 'jpeg', 'png'].includes(fileExt)) {
						const images: string[] = imageMap.get(currentDirectoryId) || [];
						images.push(absolute);
						imageMap.set(currentDirectoryId, images)

						const nImages: number = [...imageMap.values()].reduce((acc, x) => acc + x.length, 0);
						await reply(Message.success({
							percentage: 10, title: 'Step 2/3 - Collecting images', description: `Collected ${nImages} images...`
						}));
					}
				}
			}
		};

		await getFilesRecursively(payload.dataPath, categoryId);

		// Step 3: Generate image thumbnails
		await fs.mkdir(path.join(payload.path, 'thumbnails'));
		const nImages: number = [...imageMap.values()].reduce((acc, x) => acc + x.length, 0);
		let count = 0;
		for (const [categoryId, images] of imageMap) {
			const category = await database.select().from(categoryTbl).where(eq(categoryTbl.id, categoryId));

			for (let i = 0; i < images.length; i++) {
				const thumbnailPath = path.join(payload.path, 'thumbnails', `${i}.jpg`)
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
						path: path.relative(category[0].path, images[i]),
						name: path.basename(images[i]),
						thumbnail: path.relative(payload.path, thumbnailPath),
						width: metadata.width,
						height: metadata.height,
						format: metadata.format,
						size: metadata.size,
						categoryId: category[0].id
					});
				} catch (e) {
					await reply(Message.warning("Unable to read " + images[i] + ', Ignoring...'));
				} finally {
					count += 1;
				}
			}
		}
	}
}