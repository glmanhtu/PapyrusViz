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
	AssemblingDTO, AssemblingExportRequest,
	AssemblingImage,
	AssemblingImageChangeRequest, AssemblingImageRequest,
	GetAssemblingRequest, IMessage, Message, PRequest, Progress,
	Transforms,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import { AssemblingStatus, assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { imgTbl } from '../entities/img';
import { and, eq } from 'drizzle-orm';
import { categoryTbl } from '../entities/category';
import { assemblingService } from '../services/assembling.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { imageService } from '../services/image.service';
import sharp from 'sharp';
import path from 'node:path';
import * as dataUtils from '../utils/data.utils';
import * as pathUtils from '../utils/path.utils';



export class AssemblingHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('assembling:get-assemblings', this.getAssemblings.bind(this));
		this.addRoute('assembling:create-assembling', this.createAssembling.bind(this));
		this.addRoute('assembling:update-assembling', this.updateAssembling.bind(this));
		this.addRoute('assembling:close-assembling', this.closeAssembling.bind(this));
		this.addRoute('assembling:get-activated-assembling-id', this.getActivatedAssemblingId.bind(this));
		this.addRoute('assembling:update-assembling-img', this.updateAssemblingImage.bind(this));
		this.addRoute('assembling:create-assembling-img', this.createAssemblingImage.bind(this));
		this.addRoute('assembling:delete-assembling-img', this.deleteAssemblingImage.bind(this));
		this.addRoute('assembling:set-activated-assembling-id', this.setActivatedAssemblingId.bind(this));
		this.addRoute('assembling:get-images', this.getAssemblingImages.bind(this));
		this.addContinuousRoute('assembling::export-img', this.exportImg.bind(this));
	}

	public async deleteAssemblingImage(payload: AssemblingImageRequest): Promise<void> {
		return assemblingService.deleteAssembledImage(payload.projectPath, payload.assemblingId, payload.imageId)
	}

	private async createAssembling(projectPath: string): Promise<AssemblingDTO> {
		return assemblingService.createAssembling(projectPath);
	}

	private async getAssemblings(projectPath: string): Promise<AssemblingDTO[]> {
		const database = dbService.getConnection(projectPath);
		// We don't specify projectId since there should be only one project available at a time
		return database.select().from(assemblingTbl).where(eq(assemblingTbl.status, AssemblingStatus.ENABLED));
	}

	private async getActivatedAssemblingId(projectPath: string): Promise<number> {
		return assemblingService.getActivatedAssembling(projectPath);
	}

	private async setActivatedAssemblingId(request: GetAssemblingRequest): Promise<void> {
		await assemblingService.updateActivatedAssembling(request.projectPath, request.assemblingId);
	}

	private async exportImg(payload: AssemblingExportRequest,  reply: (message: IMessage<string | Progress>) => Promise<void>) {
		const assemblingImages = await assemblingService.getAssemblingImages(payload.projectPath, payload.assemblingId);
		
		const imgPathComponents = path.parse(payload.outputFile);
		const outputFile = path.format({
			dir: imgPathComponents.dir,
			name: imgPathComponents.name,
			ext: '.png'
		});

		const images = [];
		for (const assemblingImg of assemblingImages) {
			const image = assemblingImg.img
			const transforms = {
				zIndex: (assemblingImg.img_assembling.transforms as Transforms).zIndex || 1,
				top: (assemblingImg.img_assembling.transforms as Transforms).top || 10,
				left: (assemblingImg.img_assembling.transforms as Transforms).left || 10,
				scale: (assemblingImg.img_assembling.transforms as Transforms).scale || 1,
				rotation: (assemblingImg.img_assembling.transforms as Transforms).rotation || 0
			}
			const zIndex = transforms.zIndex;
			const rotation = transforms.rotation || 0;
			const scale = transforms.scale || 1;
			const width = Math.round(scale * image.width);
			const height = Math.round(scale * image.height);
			const top = transforms.top;
			const left = transforms.left;
			const imgPath = image.fragment === ''
				? path.join(assemblingImg.category.path, assemblingImg.img.path)
				: pathUtils.segmentationPath(assemblingImg.category, image);
			let processedImage = await sharp(imgPath)
				.resize({ width: width, height: height })
				.png()
				.toBuffer();

			const metaData1 = await sharp(processedImage).metadata();
			const widthBeforeRotate = metaData1.width;
			const heightBeforeRotate = metaData1.height;

			processedImage = await sharp(processedImage)
				.rotate(rotation, { background: { r: 0, g: 0, b: 0, alpha: 0 } })
				.toBuffer();

			const metaData = await sharp(processedImage).metadata();

			const wChange = (metaData.width - widthBeforeRotate) / 2;
			const hChange = (metaData.height - heightBeforeRotate) / 2;

			images.push({
				img: processedImage,
				zIndex: zIndex,
				top: Math.round(top - hChange),
				left: Math.round(left - wChange),
				width: metaData.width,
				height: metaData.height
			});

			await reply(Message.success({
				percentage: 80 * images.length / assemblingImages.length,
				title: 'Processing image fragments...',
				description: `Processed ${images.length} / ${assemblingImages.length} fragments`
			}))
		}

		const minX = Math.min(...dataUtils.getItemList(images, (x) => x.left));
		const maxX = Math.max(...dataUtils.getItemList(images, (x) => x.left + x.width - minX));

		const minY = Math.min(...dataUtils.getItemList(images, (x) => x.top));
		const maxY = Math.max(...dataUtils.getItemList(images, (x) => x.top + x.height - minY));

		const fragments = images.sort((a, b) => a.zIndex - b.zIndex);
		const composites = [];
		for (let i = 0; i < fragments.length; i++) {
			composites.push({
				input: fragments[i].img,
				top: fragments[i].top - minY,
				left: fragments[i].left - minX
			});
		}

		await reply(Message.success({
			percentage: 90,
			title: 'Generating image...',
			description: `Combining final output...`
		}))

		await sharp({
			create: {
				width: maxX,
				height: maxY,
				channels: 4,
				background: { r: 255, g: 255, b: 255, alpha: 1 }
			}})
			.composite(composites)
			.toFile(outputFile);

		await reply(Message.success({
			percentage: 100,
			title: 'Completed!',
			description: `Final output image is generated!`
		}))

	}

	private async updateAssembling(payload: PRequest<AssemblingDTO>): Promise<void> {
		const database = dbService.getConnection(payload.projectPath);
		await database.update(assemblingTbl).set({
			name: payload.payload.name,
			group: payload.payload.group,
			transforms: payload.payload.transforms
		}).where(eq(assemblingTbl.id, payload.payload.id));
	}

	private async closeAssembling(payload: PRequest<number>): Promise<void> {
		const database = dbService.getConnection(payload.projectPath);
		await database.update(assemblingTbl).set({
			status: AssemblingStatus.CLOSED,
		}).where(eq(assemblingTbl.id, payload.payload));
	}

	private async createAssemblingImage(request: AssemblingImageChangeRequest): Promise<AssemblingImage> {
		const database = dbService.getConnection(request.projectPath);
		await this.updateAssemblingImage(request);
		return database.select()
			.from(imgAssemblingTbl)
			.leftJoin(imgTbl, eq(imgAssemblingTbl.imgId, imgTbl.id))
			.leftJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(and(eq(imgAssemblingTbl.assemblingId, request.assemblingId), eq(imgAssemblingTbl.imgId, request.imageId)))
			.then(takeUniqueOrThrow)
			.then(x => ({
				img: imageService.resolveImg(x.category, x.img),
				transforms: {
					zIndex: (x.img_assembling.transforms as Transforms).zIndex || 1,
					top: (x.img_assembling.transforms as Transforms).top || 10,
					left: (x.img_assembling.transforms as Transforms).left || 10,
					scale: (x.img_assembling.transforms as Transforms).scale || 1,
					rotation: (x.img_assembling.transforms as Transforms).rotation || 0
				}
			}));
	}

	private async updateAssemblingImage(request: AssemblingImageChangeRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		await database.insert(imgAssemblingTbl)
			.values({
				imgId: request.imageId,
				assemblingId: request.assemblingId,
				transforms: request.transforms
			})
			.onConflictDoUpdate({
				target: [imgAssemblingTbl.imgId, imgAssemblingTbl.assemblingId],
				set: {
					transforms: request.transforms
				},
				where: and(eq(imgAssemblingTbl.imgId, request.imageId), eq(imgAssemblingTbl.assemblingId, request.assemblingId))
			})
	}

	private async getAssemblingImages(request: GetAssemblingRequest): Promise<AssemblingImage[]> {
		return assemblingService.getAssemblingImages(request.projectPath, request.assemblingId)
			.then(items => items.map((x) => ({
				img: imageService.resolveImg(x.category, x.img),
				transforms: {
					zIndex: (x.img_assembling.transforms as Transforms).zIndex || 1,
					top: (x.img_assembling.transforms as Transforms).top || 10,
					left: (x.img_assembling.transforms as Transforms).left || 10,
					scale: (x.img_assembling.transforms as Transforms).scale || 1,
					rotation: (x.img_assembling.transforms as Transforms).rotation || 0
				}
			})));
	}
}