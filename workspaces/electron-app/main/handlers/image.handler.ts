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

import { BaseHandler } from "./base.handler";
import { ImgStatus, imgTbl } from '../entities/img';
import { and, eq, like } from 'drizzle-orm';
import { categoryTbl, DefaultCategory } from '../entities/category';
import { takeUniqueOrThrow } from '../utils/data.utils';
import path from 'node:path';
import { dbService } from '../services/database.service';
import { ImageRequest, ImgDto, ImgSegmentationRequest, ThumbnailRequest, ThumbnailResponse } from 'shared-lib';
import { imageService } from '../services/image.service';
import { promises as fs } from 'fs';
import * as pathUtils from '../utils/path.utils';



export class ImageHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('image:get-thumbnails', this.getImages.bind(this));
		this.addRoute('image:archive', this.archiveImage.bind(this));
		this.addRoute('image:unarchive', this.unarchiveImage.bind(this));
		this.addRoute('image:get-image', this.getImage.bind(this));
		this.addRoute('image:register-image-segmentation', this.registerImageSegmentation.bind(this));
		this.addRoute('image:detect-papyrus', this.detectPapyrus.bind(this));
		this.addRoute('image:segment-papyrus', this.segmentPapyrus.bind(this));
	}

	private async archiveImage(request: ImageRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		await database.update(imgTbl).set({status: ImgStatus.ARCHIVED}).where(eq(imgTbl.id, request.imgId));
	}

	private async registerImageSegmentation(request: ImgSegmentationRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		const imData = await database.select()
			.from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgTbl.id, request.imgId))
			.then(takeUniqueOrThrow);
		imageService.registerImageFeatures(imData.img, imData.category);
	}

	private async segmentPapyrus(request: ImgSegmentationRequest): Promise<ImgDto> {
		const database = dbService.getConnection(request.projectPath);
		const imData = await database.select()
			.from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgTbl.id, request.imgId))
			.then(takeUniqueOrThrow);
		const embeddings = await imageService.getEmbedding(request.imgId);
		const result = await imageService.detectMask(embeddings, imData.img, request.points);
		const segmentation_dir = pathUtils.fromAppData('segmentation', path.dirname(imData.img.path));
		await fs.mkdir(segmentation_dir, {recursive: true})
		const segmentation_path = path.join(segmentation_dir, path.basename(imData.img.path).split('.')[0] + ".png");
		await imageService.segmentImage(segmentation_path, result, imData.img, imData.category);
		// await database.update(imgTbl).set({fragment: imData.img.path}).where(eq(imgTbl.id, imData.img.id));
		// imData.img.fragment = imData.img.path
		// Todo: Create the segmented image here
		return imageService.resolveImg(imData.category, imData.img)
	}

	private async detectPapyrus(request: ImgSegmentationRequest): Promise<string> {
		const database = dbService.getConnection(request.projectPath);
		const imData = await database.select()
			.from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgTbl.id, request.imgId))
			.then(takeUniqueOrThrow);
		const embeddings = await imageService.getEmbedding(request.imgId);
		const result = await imageService.detectMask(embeddings, imData.img, request.points);
		return imageService.tensorToBase64Img(result, imData.img.width, imData.img.height);
	}

	private async unarchiveImage(request: ImageRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		await database.update(imgTbl).set({status: ImgStatus.ONLINE}).where(eq(imgTbl.id, request.imgId));
	}

	private async getImage(request: ImageRequest): Promise<ImgDto> {
		const database = dbService.getConnection(request.projectPath);
		return database.select()
			.from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgTbl.id, request.imgId))
			.then(takeUniqueOrThrow)
			.then(x => imageService.resolveImg(x.category, x.img));
	}

	private async getImages(request: ThumbnailRequest): Promise<ThumbnailResponse> {
		const database = dbService.getConnection(request.projectPath);
		const category = await database.select().from(categoryTbl)
			.where(eq(categoryTbl.id, request.categoryId)).then(takeUniqueOrThrow);

		const images = database.select().from(imgTbl)
			.where(and(
				request.filter.length > 0
					? like(imgTbl.path, `%${request.filter}%`)
					: undefined,
				category.path !== ''
					? eq(imgTbl.categoryId, request.categoryId)
					: undefined,
				category.name === DefaultCategory.ARCHIVED
					? eq(imgTbl.status, ImgStatus.ARCHIVED)
					: eq(imgTbl.status, ImgStatus.ONLINE)
			))
			.orderBy(imgTbl.name)
			.limit(request.perPage)
			.offset(request.page * request.perPage);

		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.id, path: "atom://" + path.join(request.projectPath, x.thumbnail), imgName: x.name,
				orgImgWidth: x.width, orgImgHeight: x.height
			}))
		}));
	}
}