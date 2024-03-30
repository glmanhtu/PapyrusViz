import { BaseHandler } from "./base.handler";
import { IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
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

export class ProjectHandler extends BaseHandler {
	constructor(private databases: Map<string, BetterSQLite3Database>) {
		super();
		this.addContinuousHandler<ProjectDTO, Progress>('project::create-project', this.creteProject.bind(this));
		this.addRoute<void, ProjectInfo[]>('project:get-projects', this.getProjects);
	}

	private async getProjects(): Promise<ProjectInfo[]> {
		const {projects} = await dataUtils.readAppData();
		return projects;
	}

	private async projectExists(projectPath: string): Promise<boolean> {
		const projects = await this.getProjects();
		return projects.some(project => project.projPath === projectPath);
	}

	// private async loadProject(projectPath: string): Promise<ProjectDTO> {
	// 	const isProjPathExists = await pathUtils.isDir(projectPath);
	// 	if (!isProjPathExists) {
	//
	// 	}
	// }

	private async creteProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => Promise<void> ): Promise<void> {
		const isProjPathExists = await pathUtils.isDir(payload.path)
		const isDSPathExists = await pathUtils.isDir(payload.dataPath);
		if (isProjPathExists && (await fs.readdir(payload.path)).length !== 0) {
			await reply(Message.error(`Project location: ${payload.path} is not empty!`));
			return;
		}
		if (!isDSPathExists) {
			await reply(Message.error(`Dataset location: ${payload.dataPath} doesn't exists!`));
			return;
		}

		await reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));

		if (!isProjPathExists) {
			await fs.mkdir(payload.path);
		}

		const databaseFile = path.join(payload.path, 'project.db')
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
						.resize({ height: 200 })
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