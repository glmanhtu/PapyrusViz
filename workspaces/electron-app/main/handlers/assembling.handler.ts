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
import { assemblingService } from '../services/assembling.service';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { projectService } from '../services/project.service';
import { imageService } from '../services/image.service';

export class AssemblingHandler extends BaseHandler {
	constructor() {
		super();
		this.addRoute('assembling:get-assemblings', this.getAssemblings.bind(this));
		this.addRoute('assembling:create-assembling', this.createAssembling.bind(this));
		this.addRoute('assembling:get-activated-assembling-id', this.getActivatedAssemblingId.bind(this));
		this.addRoute('assembling:update-assembling-img', this.updateAssemblingImage.bind(this));
		this.addRoute('assembling:create-assembling-img', this.createAssemblingImage.bind(this));
		this.addRoute('assembling:set-activated-assembling-id', this.setActivatedAssemblingId.bind(this));
		this.addRoute('assembling:get-images', this.getAssemblingImages.bind(this));
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
		const project = await projectService.getProjectByPath(projectPath);
		const assembling = await database.insert(assemblingTbl).values({
			name: 'Assembling #',
			group: 'default',
			projectId: project.id
		}).returning({insertedId: assemblingTbl.id}).then(takeUniqueOrThrow)
		const assemblingId = assembling.insertedId;
		await assemblingService.updateActivatedAssembling(projectPath, assemblingId);

		await database.update(assemblingTbl)
			.set({name: 'Assembling #' + assemblingId})
			.where(eq(assemblingTbl.id, assemblingId));
		return await database.select().from(assemblingTbl).where(eq(assemblingTbl.id, assemblingId)).then(takeUniqueOrThrow)
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
		const database = dbService.getConnection(request.projectPath);
		return database.select()
			.from(imgAssemblingTbl)
			.leftJoin(imgTbl, eq(imgAssemblingTbl.imgId, imgTbl.id))
			.leftJoin(categoryTbl, eq(imgTbl.categoryId, categoryTbl.id))
			.where(eq(imgAssemblingTbl.assemblingId, request.assemblingId))
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