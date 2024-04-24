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


export class ImageHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('image:get-thumbnails', this.getImages.bind(this));
		this.addRoute('image:archive', this.archiveImage.bind(this));
		this.addRoute('image:unarchive', this.unarchiveImage.bind(this));
		this.addRoute('image:get-image', this.getImage.bind(this));
		this.addRoute('image:segment-image', this.segmentImage.bind(this));
	}

	private async archiveImage(request: ImageRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		await database.update(imgTbl).set({status: ImgStatus.ARCHIVED}).where(eq(imgTbl.id, request.imgId));
	}

	private async segmentImage(request: ImgSegmentationRequest): Promise<void> {
		const database = dbService.getConnection(request.projectPath);
		const imData = await database.select()
			.from(imgTbl)
			.innerJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgTbl.id, request.imgId))
			.then(takeUniqueOrThrow);
		await imageService.extractImageFeatures(imData.img, imData.category);
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