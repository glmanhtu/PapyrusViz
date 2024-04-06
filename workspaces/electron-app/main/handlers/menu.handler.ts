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
import { BrowserWindow, Menu } from 'electron';
import { AssemblingImage, AssemblingImageRequest, ContextAction } from 'shared-lib';
import { dbService } from '../services/database.service';
import { categoryTbl } from '../entities/category';
import { imgTbl } from '../entities/img';
import { eq } from 'drizzle-orm';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { assemblingService } from '../services/assembling.service';
import { imageService } from '../services/image.service';

export class MenuHandler extends BaseHandler {
	constructor(private readonly mainWin: BrowserWindow) {
		super();
		this.addRoute('menu:context:get-image-context', this.getImageContext.bind(this));
		this.mainWin = mainWin;
	}

	private async getImageContext(payload: AssemblingImageRequest): Promise<ContextAction<AssemblingImage>> {
		const database = dbService.getConnection(payload.projectPath);
		const img = await database.select().from(imgTbl)
			.where(eq(imgTbl.id, payload.imageId)).then(takeUniqueOrThrow);
		const imgVersions = await database.select().from(categoryTbl)
			.leftJoin(imgTbl, eq(categoryTbl.id, imgTbl.categoryId)).where(eq(imgTbl.path, img.path));

		return new Promise<ContextAction<AssemblingImage>>((resolve, reject) => {
			const subMenuVersion = imgVersions.map((x) => ({
				label: x.category.name,
				click: () => {
					assemblingService.swapAssembledImage(payload.projectPath, payload.assemblingId, img, x.img)
						.then(res => resolve({
							name: 'replace',
							data: {...res, img: imageService.resolveImg(x.category, res.img)}
						}))
						.catch(reject);
				}
			}))

			const template: Electron.MenuItemConstructorOptions[] = [
				{
					label: 'To Front',
					click: () => {

					}
				},
				{
					label: 'To Back',
					click: () => {

					}
				},
				{ type: 'separator' },
				{
					label: 'Delete',
					accelerator: 'Backspace',
					click: () => {
						assemblingService.deleteAssembledImage(payload.projectPath, payload.assemblingId, img)
							.then(() => resolve({ name: 'delete', data: null }))
							.catch(reject)
					}
				},
				{ type: 'separator' },
				{
					label: 'Find similarities',
					accelerator: 'CmdOrCtrl+F',
					click: () => {
						resolve({ name: 'similarity', data: null })
					}
				},
				{
					label: 'Switch version',
					enabled: subMenuVersion.length > 0,
					submenu: subMenuVersion
				}
			]
			const menu = Menu.buildFromTemplate(template)
			menu.popup({ window: this.mainWin })
		});

	}

}