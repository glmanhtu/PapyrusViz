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

import { Config } from '../entities/user-config-tbl';
import { and, eq } from 'drizzle-orm';
import { dbService } from './database.service';
import { Img } from '../entities/img';
import { imgAssemblingTbl } from '../entities/img-assembling';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { AssemblingImage, Transforms } from 'shared-lib';
import { configService } from './config.service';

class AssemblingService {

	public async updateActivatedAssembling(projectPath: string, assemblingId: number): Promise<void> {
		await configService.updateConfig(projectPath, Config.ACTIVATED_ASSEMBLING_ID, assemblingId.toString());
	}

	public async getActivatedAssembling(projectPath: string): Promise<number> {
		return await configService.getConfig(projectPath, Config.ACTIVATED_ASSEMBLING_ID, "1")
			.then(x => parseInt(x))
	}

	public async deleteAssembledImage(projectPath: string, assemblingId: number, img: Img): Promise<void> {
		const database = dbService.getConnection(projectPath);
		await database.delete(imgAssemblingTbl)
				.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, img.id)));
  }

	public async swapAssembledImage(projectPath: string, assemblingId: number, fromImg: Img, toImg: Img) : Promise<AssemblingImage> {
		const database = dbService.getConnection(projectPath);
		const imgAssembling = await database.select().from(imgAssemblingTbl)
			.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, fromImg.id)))
			.then(takeUniqueOrThrow);
		const transforms = imgAssembling.transforms as Transforms
		transforms.scale = (transforms.scale * fromImg.width) / toImg.width
		await database.update(imgAssemblingTbl).set({imgId: toImg.id, transforms: transforms})
			.where(and(eq(imgAssemblingTbl.assemblingId, assemblingId), eq(imgAssemblingTbl.imgId, fromImg.id)));
		return { img: toImg, transforms: transforms }
	}
}

const assemblingService = new AssemblingService();
export { assemblingService };