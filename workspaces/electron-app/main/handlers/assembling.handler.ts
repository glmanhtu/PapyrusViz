import { BaseHandler } from './base.handler';
import { AssemblingDTO, AssemblingImage, AssemblingImageRequest, CategoryDTO, Transforms } from 'shared-lib';
import { dbService } from '../services/database.service';
import { assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { imgTbl } from '../entities/img';
import { eq } from 'drizzle-orm';
import { categoryTbl } from '../entities/category';
import path from 'node:path';

export class AssemblingHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute<string, CategoryDTO>('assembling:get-assemblings', this.getAssemblings.bind(this));
		this.addRoute<AssemblingImageRequest, AssemblingImage[]>('assembling:get-images', this.getAssemblingImages.bind(this));
	}

	private async getAssemblings(projectPath: string): Promise<AssemblingDTO[]> {
		const database = dbService.getConnection(projectPath);
		return database.select().from(assemblingTbl);
	}

	private async getAssemblingImages(request: AssemblingImageRequest): Promise<AssemblingImage[]> {
		const database = dbService.getConnection(request.projectPath);
		return database.select()
			.from(imgAssemblingTbl)
			.leftJoin(imgTbl, eq(imgAssemblingTbl.imgId, imgTbl.id))
			.leftJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgAssemblingTbl.assemblingId, request.assemblingId))
			.then(items => items.map((x) => ({
				img: {
					...x.img,
					path: 'atom://' + path.join(x.category.path, x.img.path)
				},
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