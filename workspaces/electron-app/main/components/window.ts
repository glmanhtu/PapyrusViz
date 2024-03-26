import * as remoteMain from '@electron/remote/main';
import { app, BrowserWindow, ipcMain, nativeImage } from 'electron';
import * as path from 'node:path';
import { Logger } from '../utils/logger';
import { GlobalConfig } from 'shared-lib';
import { DialogHandler } from '../handlers/dialog.handler';
import { BaseHandler } from '../handlers/base.handler';

declare const global: GlobalConfig;
declare const MAIN_WINDOW_PRELOAD_WEBPACK_ENTRY: string;

export class Window {
	private _electronWindow: BrowserWindow | undefined;

	constructor() {
		this.createWindow();
		this.loadRenderer();
		const combinedRouteMap = this.combineRoutes(new DialogHandler(this._electronWindow));
		ipcMain.on('ipc-request', async (event, message: { type: string; payload: unknown; requestId: string }) => {
			const { type, payload, requestId } = message;
			const handlerFunction = combinedRouteMap.get(type);
			if (handlerFunction) {
				try {
					const response = await handlerFunction(payload);
					event.reply(`ipc-response:${requestId}`, { type, status: 'success', payload: response });
				} catch (error) {
					event.reply(`ipc-response:${requestId}`, { type, status: 'error', payload: error.message });
				}
			} else {
				event.reply(`ipc-response:${requestId}`, { type, status: 'error', payload: 'Handler not found' });
			}
		});
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

	private combineRoutes(...handlers: BaseHandler[]): Map<string, (payload: unknown) => Promise<unknown>> {
		const combined = new Map<string, (payload: unknown) => Promise<unknown>>();
		handlers.forEach(handler => {
			handler.getRoutes().forEach((value, key) => {
				combined.set(key, value);
			});
		});
		return combined;
	}

	public get electronWindow(): BrowserWindow | undefined {
		return this._electronWindow;
	}
}
