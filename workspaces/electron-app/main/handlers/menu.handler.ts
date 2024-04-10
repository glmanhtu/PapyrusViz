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
import { app, BrowserWindow, globalShortcut, Menu } from 'electron';
import {
	AssemblingDTO,
	AssemblingImage,
	AssemblingImageRequest,
	ChannelMessage,
	ContextAction,
	ExtrasChannels,
	ImageRequest,
} from 'shared-lib';
import { dbService } from '../services/database.service';
import { categoryTbl } from '../entities/category';
import { ImgStatus, imgTbl } from '../entities/img';
import { eq } from 'drizzle-orm';
import { takeUniqueOrThrow } from '../utils/data.utils';
import { assemblingService } from '../services/assembling.service';
import { imageService } from '../services/image.service';
import MenuItemConstructorOptions = Electron.MenuItemConstructorOptions;

export class MenuHandler extends BaseHandler {
	constructor(private readonly mainWin: BrowserWindow) {
		super();
		this.addRoute('menu:context:get-image-context', this.getImageContext.bind(this));
		this.addRoute('menu:context:get-thumbnail-context', this.getThumbnailContext.bind(this));
		this.addRoute('menu:context:get-assembling-context', this.getAssemblingContext.bind(this));
		this.mainWin = mainWin;
		this.registerMenu();
	}

	private sendHotKeyCommandToRenderer(command: string) {
		const message: ChannelMessage<ChannelMessage<string>> = {
			channel: ExtrasChannels.HOTKEY,
			message: {
				status: 'success',
				payload: command
			}
		}
		this.mainWin.webContents.send('ipc-extras', message)
	}

	private registerMenu() {
		const isMac = process.platform === 'darwin';
		app.on('browser-window-focus', (function() {
			globalShortcut.register('CommandOrControl+A', () =>
				this.sendHotKeyCommandToRenderer('main:menu:select-all')
			)
		}).bind(this));
		app.on('browser-window-blur', function() {
			globalShortcut.unregister('CommandOrControl+A');
		});
		const template: MenuItemConstructorOptions[] = isMac ? [{
			label: app.name,
			submenu: [
				{ role: 'about' },
				{ type: 'separator' },
				{ role: 'services' },
				{ type: 'separator' },
				{ role: 'hide' },
				{ role: 'hideOthers' },
				{ role: 'unhide' },
				{ type: 'separator' },
				{ role: 'quit' }
			]
		}] : [];
		
		const menu: MenuItemConstructorOptions[] = [
			{
				label: 'File',
				submenu: [
					isMac ? { role: 'close' } : { role: 'quit' }
				]
			},
			{
				label: 'Edit',
				submenu: [
					{ role: 'cut' },
					{ role: 'copy' },
					{ type: 'separator' },
					{
						label: 'Delete',
						accelerator: 'Backspace',
						click: () => { this.sendHotKeyCommandToRenderer('main:menu:img-delete') }
					},
					{ type: 'separator' },
					{
						label: 'Select All',
						accelerator: 'CmdOrCtrl+A',
						click: () => { this.sendHotKeyCommandToRenderer('main:menu:select-all') }
					},
					{
						label: 'Find similarities',
						accelerator: 'CmdOrCtrl+F',
						click: () => { this.sendHotKeyCommandToRenderer('main:menu:img-find-similarity') }
					},
				]
			},
			{
				label: 'View',
				submenu: [
					{ role: 'resetZoom' },
					{ role: 'zoomIn' },
					{ role: 'zoomOut' },
					{ type: 'separator' },
					{ role: 'togglefullscreen' }
				]
			},
		];
		template.push(...menu)
		Menu.setApplicationMenu(Menu.buildFromTemplate(template));
	}

	private async getThumbnailContext(payload: ImageRequest): Promise<ContextAction<AssemblingImage>> {
		const database = dbService.getConnection(payload.projectPath);
		const img = await database.select().from(imgTbl)
			.where(eq(imgTbl.id, payload.imgId)).then(takeUniqueOrThrow);

		return new Promise<ContextAction<AssemblingImage>>((resolve, _) => {
			const template: Electron.MenuItemConstructorOptions[] = [
				{
					label: 'Open',
					click: () => {
						resolve({ name: 'open', data: null })
					}
				},
				{ type: 'separator' },
				{
					label: 'Archive',
					enabled: img.status === ImgStatus.ONLINE,
					click: () => {
						resolve({ name: 'archive', data: null })
					}
				},
				{
					label: 'Unarchive',
					enabled: img.status === ImgStatus.ARCHIVED,
					click: () => {
						resolve({ name: 'unarchive', data: null })
					}
				},
				{ type: 'separator' },
				{
					label: 'Find similarities',
					click: () => {
						resolve({ name: 'similarity', data: null })
					}
				}
			]
			const menu = Menu.buildFromTemplate(template)
			menu.popup({ window: this.mainWin })
		});
	}


	private async getAssemblingContext(): Promise<ContextAction<AssemblingDTO>> {
		return new Promise<ContextAction<AssemblingDTO>>((resolve, _) => {
			const template: Electron.MenuItemConstructorOptions[] = [
				{
					label: 'Rename',
					click: () => {
						resolve({ name: 'rename', data: null })
					}
				},
				{ type: 'separator' },
				{
					label: 'Delete',
					// We use delete instead of close because we haven't implemented the feature to recover a closed assembling
					// Todo: implement closed assembling feature
					click: () => {
						resolve({ name: 'close', data: null })
					}
				},
			]
			const menu = Menu.buildFromTemplate(template)
			menu.popup({ window: this.mainWin })
		});
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
						resolve({ name: 'to_front', data: null })
					}
				},
				{
					label: 'To Back',
					click: () => {
						resolve({ name: 'to_back', data: null })
					}
				},
				{ type: 'separator' },
				{
					label: 'Delete',
					accelerator: 'Backspace',
					click: () => {
						 resolve({ name: 'delete', data: null })
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