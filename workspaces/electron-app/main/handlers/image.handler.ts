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
import { imgTbl } from '../entities/img';
import { and, eq, like } from 'drizzle-orm';
import { categoryTbl } from '../entities/category';
import { takeUniqueOrThrow } from '../utils/data.utils';
import path from 'node:path';
import { dbService } from '../services/database.service';
import { ThumbnailRequest, ThumbnailResponse } from 'shared-lib';


export class ImageHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('image:get-thumbnails', this.getImages.bind(this));
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
					: undefined
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