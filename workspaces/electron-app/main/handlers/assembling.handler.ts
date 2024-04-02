import { BaseHandler } from './base.handler';
import {
	AssemblingDTO,
	AssemblingImage,
	AssemblingImageChangeRequest,
	GetAssemblingRequest,
	Transforms,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import { assemblingTbl } from '../entities/assembling';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { imgTbl } from '../entities/img';
import { and, eq } from 'drizzle-orm';
import { categoryTbl } from '../entities/category';
import path from 'node:path';
import { projectTbl } from '../entities/project';
import { assemblingService } from '../services/assembling.service';

export class AssemblingHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute<string, AssemblingDTO[]>('assembling:get-assemblings', this.getAssemblings.bind(this));
		this.addRoute<string, AssemblingDTO>('assembling:create-assembling', this.createAssembling.bind(this));
		this.addRoute<string, number>('assembling:get-activated-assembling-id', this.getActivatedAssemblingId.bind(this));
		this.addRoute<string, void>('assembling:update-assembling-img', this.updateAssemblingImage.bind(this));
		this.addRoute<GetAssemblingRequest, void>('assembling:set-activated-assembling-id', this.setActivatedAssemblingId.bind(this));
		this.addRoute<GetAssemblingRequest, AssemblingImage[]>('assembling:get-images', this.getAssemblingImages.bind(this));
	}

	private async getAssemblings(projectPath: string): Promise<AssemblingDTO[]> {
		const database = dbService.getConnection(projectPath);
		return database.select().from(assemblingTbl);
	}

	private async getActivatedAssemblingId(projectPath: string): Promise<number> {
		return assemblingService.getActivatedAssembling(projectPath);
	}

	private async setActivatedAssemblingId(request: GetAssemblingRequest): Promise<void> {
		await assemblingService.updateActivatedAssembling(request.projectPath, request.assemblingId);
	}

	private async createAssembling(projectPath: string): Promise<AssemblingDTO> {
		const database = dbService.getConnection(projectPath);
		const project = await database.select().from(projectTbl).where(eq(projectTbl.path, projectPath));
		const assembling = await database.insert(assemblingTbl).values({
			name: 'Assembling #',
			group: 'default',
			projectId: project[0].id
		}).returning({insertedId: assemblingTbl.id});
		const assemblingId = assembling[0].insertedId;
		await assemblingService.updateActivatedAssembling(projectPath, assemblingId);

		await database.update(assemblingTbl)
			.set({name: 'Assembling #' + assemblingId})
			.where(eq(assemblingTbl.id, assemblingId));
		const result = await database.select().from(assemblingTbl).where(eq(assemblingTbl.id, assemblingId));
		return result[0];
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