import { BaseHandler } from "./base.handler";
import { imgTbl } from '../entities/img';
import { and, eq, like, SQLWrapper } from 'drizzle-orm';
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

		const filters: SQLWrapper[] = [];
		if (request.filter.length > 0) {
			filters.push(like(imgTbl.path, `%${request.filter}%`))
		}
		if (category.path !== '') {
			filters.push(eq(imgTbl.categoryId, request.categoryId))
		}

		const images = database.select().from(imgTbl)
			.where(and(...filters))
			.orderBy(imgTbl.name)
			.limit(request.perPage)
			.offset(request.page * request.perPage);

		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.id, path: "atom://" + path.join(request.projectPath, x.thumbnail), imgName: x.name
			}))
		}));
	}
}