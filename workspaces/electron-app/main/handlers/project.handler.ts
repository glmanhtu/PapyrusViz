import { BaseHandler } from "./base.handler";
import { IMessage, Message, Progress, ProjectDTO } from 'shared-lib';
import * as fs from 'fs';
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { projects } from '../entities/project';
import path from 'node:path';
import { categories } from '../entities/category';
import { eq } from 'drizzle-orm';
import { imgs } from '../entities/img';

import sharp from 'sharp'

export class ProjectHandler extends BaseHandler {
	constructor(private database: BetterSQLite3Database) {
		super();
		this.addContinuousHandler<ProjectDTO, Progress>('project::create-project', this.creteProject.bind(this));
	}

	private async creteProject(payload: ProjectDTO, reply: (message: IMessage<string | Progress>) => void ): Promise<void> {
		const isProjPathExists = fs.existsSync(payload.path) && fs.lstatSync(payload.path).isDirectory();
		const isDSPathExists = fs.existsSync(payload.dataPath) && fs.lstatSync(payload.dataPath).isDirectory();
		if (isProjPathExists && fs.readdirSync(payload.path).length !== 0) {
			reply(Message.error(`Project location: ${payload.path} is not empty!`));
			return;
		}
		if (!isDSPathExists) {
			reply(Message.error(`Dataset location: ${payload.dataPath} doesn't exists!`));
			return;
		}
		reply(Message.success({
			percentage: 0, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));
		if (!isProjPathExists) {
			fs.mkdirSync(payload.path);
		}
		const result = await this.database.insert(projects).values({
			name: payload.name,
			path: payload.path,
			dataPath: payload.dataPath,
			os: process.platform
		}).returning({insertedId: projects.id});
		const projectId = result[0].insertedId;

		reply(Message.success({
			percentage: 10, title: 'Step 1/3 - Creating project', description: 'Writing project information...'
		}));

		// Step 2: Get image files
		const category = await this.database.insert(categories).values({
			name: 'All images',
			path: '',
			projectId: projectId
		}).returning({insertedId: categories.id});
		const categoryId = category[0].insertedId;

		const imageMap = new Map<number, string[]>();
		const getFilesRecursively = async (directory: string, categoryId: number, level = 0): Promise<void> => {
			const filesInDirectory = fs.readdirSync(directory);
			for (let i = 0; i < filesInDirectory.length; i++) {
				const absolute = path.join(directory, filesInDirectory[i]);
				let currentDirectoryId = categoryId;
				if (fs.statSync(absolute).isDirectory()) {
					if (level === 0) {
						const category = await this.database.insert(categories).values({
							name: filesInDirectory[i],
							path: absolute,
							projectId: projectId
						}).returning({insertedId: categories.id});
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
						reply(Message.success({
							percentage: 10, title: 'Step 2/3 - Collecting images', description: `Collected ${nImages} images...`
						}));
					}
				}
			}
		};

		await getFilesRecursively(payload.dataPath, categoryId);

		// Step 3: Generate image thumbnails
		fs.mkdirSync(path.join(payload.path, 'thumbnails'));
		for (const [categoryId, images] of imageMap) {
			const category = await this.database.select().from(categories).where(eq(categories.id, categoryId));

			for (let i = 0; i < images.length; i++) {
				const thumbnailPath = path.join(payload.path, 'thumbnails', `${i}.jpg`)
				const image = sharp(images[i]);
				try {
					await image
						.resize({ height: 200 })
						.flatten({ background: { r: 255, g: 255, b: 255 } })
						.toFile(thumbnailPath);
					const metadata = await image.metadata();

					const per = (i + 1) * 90 / images.length;
					reply(Message.success({
						percentage: 10 + per, title: 'Step 3/3 - Generating thumbnails...',
						description: `Generated ${i + 1}/${images.length} thumbnails images...`
					}));
					const relPath = path.relative(category[0].path, images[i]);
					await this.database.insert(imgs).values({
						path: relPath,
						name: path.basename(images[i]),
						thumbnail: thumbnailPath,
						width: metadata.width,
						height: metadata.height,
						format: metadata.format,
						size: metadata.size,
						categoryId: category[0].id
					});
				} catch (e) {
					reply(Message.error("Unnable to read " + images[i] + ', Ignoring...'));
				}
			}
		}
	}
}