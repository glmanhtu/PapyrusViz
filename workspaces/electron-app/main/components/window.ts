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

import * as remoteMain from '@electron/remote/main';
import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import * as path from 'node:path';
import { Logger } from '../utils/logger';
import { GlobalConfig } from 'shared-lib';

declare const global: GlobalConfig;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class Window {
	private _electronWindow: BrowserWindow | undefined;

	constructor() {
		this.createWindow();
		this.loadRenderer();
	}

	private createWindow(): void {
		this._electronWindow = new BrowserWindow({
			width: 1350,
			height: 850,
			minWidth: 1350,
			minHeight: 850,
			icon: this.loadIcon(),
			webPreferences: {
				// Default behavior in Electron since 5, that
				// limits the powers granted to remote content
				nodeIntegration: global.appConfig.isNodeIntegration,
				// Isolate window context to protect against prototype pollution
				contextIsolation: global.appConfig.isContextIsolation,
				// Introduced in Electron 20 and enabled by default
				// Among others security constraints, it prevents from required
				// CommonJS modules imports to be bundled into preload script
				sandbox: global.appConfig.isSandbox,
				// Use a preload script to enhance security
				preload: MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY,
			},
		});

		// Disable the remote module to enhance security
		if (global.appConfig.isEnableRemoteModule) {
			remoteMain.enable(this._electronWindow.webContents);
		}
	}

	private loadIcon(): Electron.NativeImage | undefined {
		let iconObject;
		if (global.appConfig.isIconAvailable) {
			const iconPath = path.join(__dirname, 'icons/icon.png');
			Logger.debug('Icon Path', iconPath);
			iconObject = nativeImage.createFromPath(iconPath);
			// Change dock icon on MacOS
			if (iconObject && process.platform === 'darwin') {
				app.dock.setIcon(iconObject);
			}
		}
		return iconObject;
	}

	private loadRenderer(): void {
		if (global.appConfig.configId === 'development') {
			// Dev mode, take advantage of the live reload by loading local URL
			this.electronWindow.loadURL(`http://localhost:4200`);
		} else {
			// Else mode, we simply load angular bundle
			const indexPath = path.join(
				__dirname,
				'../renderer/angular_window/index.html'
			);
			this.electronWindow.loadURL(`file://${indexPath}`);
		}

		if (global.appConfig.isOpenDevTools) {
			this.openDevTools();
		}

		// When the window is closed`
		this._electronWindow.on('closed', () => {
			// Remove IPC Main listeners
			ipcMain.removeAllListeners();
			// Delete current reference
			delete this._electronWindow;
		});
	}

	private openDevTools(): void {
		this._electronWindow.webContents.openDevTools();
		this._electronWindow.webContents.on('devtools-opened', () => {
			this._electronWindow.focus();
			setImmediate(() => {
				this._electronWindow.focus();
			});
		});
	}



	public get electronWindow(): BrowserWindow | undefined {
		return this._electronWindow;
	}
}
