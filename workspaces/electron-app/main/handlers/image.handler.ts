import { BaseHandler } from "./base.handler";
import { BetterSQLite3Database } from 'drizzle-orm/better-sqlite3';
import { ThumbnailRequest, ThumbnailResponse } from 'shared-lib/.dist/models/img';
import { imgTbl } from '../entities/img';
import { and, eq, like, SQLWrapper } from 'drizzle-orm';
import { categoryTbl } from '../entities/category';
import { takeUniqueOrThrow } from '../utils/data.utils';
import path from 'node:path';


export class ImageHandler extends BaseHandler {
	constructor(private databases: Map<string, BetterSQLite3Database>) {
		super();
		this.addRoute<ThumbnailRequest, ThumbnailResponse>('image:get-thumbnails', this.getImages.bind(this));
	}

	private async getImages(request: ThumbnailRequest): Promise<ThumbnailResponse> {
		const database = this.databases.get(request.projectPath);
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
			.limit(request.perPage)
			.offset(request.page * request.perPage);

		return images.then(items => ({
			thumbnails: items.map(x => ({
				imgId: x.id, path: "atom://" + path.join(request.projectPath, x.thumbnail), imgName: x.name
			}))
		}));
	}
}