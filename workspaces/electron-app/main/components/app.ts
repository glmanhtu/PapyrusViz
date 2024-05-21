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

import { app, ipcMain, shell, protocol, net, BrowserWindow } from 'electron';
import { Window } from './window';
import { BaseHandler } from '../handlers/base.handler';
import { IMessage, Message, WindowTask } from 'shared-lib';
import { Logger } from '../utils/logger';
import * as pathUtils from '../utils/path.utils';

export class App {
	private static _windows = new Map<number, Window>();
	private static _tasks = new Map<number, WindowTask>();

	public static launch(): void {
		app.on('window-all-closed', App.quit);
		app.whenReady().then(() => {
			protocol.handle('atom', (request) =>
				net.fetch(pathUtils.replaceProtocol(request.url, 'atom://', 'file://')))
			App.createWindow();
		});

		// Limit navigation and open external links in default browser
		app.on('web-contents-created', App.openExternalLinksInDefaultBrowser);
	}

	public static getWindows(): Window[] {
		return [...this._windows.values()];
	}

	public static getWindow(id: number): BrowserWindow {
		return this._windows.get(id).electronWindow;
	}

	public static getTask(id: number): unknown {
		return this._tasks.get(id);
	}

	public static registerHandlers(handlers: BaseHandler[]) {
		const combinedRouteMap = this.combineRoutes(...handlers);
		ipcMain.on('ipc-request',  async (event, message: { type: string; payload: unknown; requestId: string }) => {
			const { type, payload, requestId } = message;
			Logger.debug('Message received: ', message)
			const handlerFunction = combinedRouteMap.get(type);
			if (handlerFunction) {
				handlerFunction(payload, event.sender.id)
					.then((response) => {
						event.reply(`ipc-response:${requestId}`, Message.success(response));
					}).catch((err) => {
					Logger.error('Error occurred, request: ', message, err)
					event.reply(`ipc-response:${requestId}`, Message.error(err.message));
				});
			} else {
				event.reply(`ipc-response:${requestId}`, Message.error('Handler not found'));
			}
		});


		const combinedContinuousMap = this.combineContinuousRoutes(...handlers);
		ipcMain.on('ipc-continuous-request', async (event,  message: { type: string; payload: unknown; requestId: string }) => {
			const { type, payload, requestId } = message;
			const handlerFunction = combinedContinuousMap.get(type);
			Logger.debug('Continuous message received: ', message)
			if (handlerFunction) {
				handlerFunction(payload, async (message) => {
					event.reply(`ipc-continuous-response:${requestId}`, message);
				}, event.sender.id).then(() => {
					event.reply(`ipc-continuous-response:${requestId}`, Message.complete(''));
				}).catch((err) => {
					Logger.error('Error occurred, request: ', message, err);
					event.reply(`ipc-continuous-response:${requestId}`, Message.error(err.message));
				});
			} else {
				event.reply(`ipc-continuous-response:${requestId}`, Message.error('Handler not found'));
			}
		})
	}
	public static createWindow(data: WindowTask = { projectPath: '', task: 'default' }) {
		const window = new Window();
		const clientId = window.electronWindow.webContents.id;
		App._tasks.set(clientId, data);
		App._windows.set(clientId, window);
		window.electronWindow.on('closed', () => {
			window.cleanup();
			App._windows.delete(clientId);
			App._tasks.delete(clientId);
		})
		Logger.info(`Windows ${clientId} is created!`)
		return clientId
	}

	private static quit() {
		ipcMain.removeAllListeners();
		app.quit();
	}

	private static combineRoutes(...handlers: BaseHandler[]): Map<string, (payload: unknown, clientId?: number) => Promise<unknown>> {
		const combined = new Map<string, (payload: unknown, clientId?: number) => Promise<unknown>>();
		handlers.forEach(handler => {
			handler.getRoutes().forEach((value, key) => {
				combined.set(key, value);
			});
		});
		return combined;
	}

	private static combineContinuousRoutes(...handlers: BaseHandler[]): Map<string, (payload: unknown, listener: (message: IMessage<unknown>) => void, clientId?: number) => Promise<void>> {
		const combined = new Map<string, (payload: unknown, listener: (message: IMessage<unknown>) => void, clientId?: number) => Promise<void>>();
		handlers.forEach(handler => {
			handler.getContinuousHandlers().forEach((value, key) => {
				combined.set(key, value);
			});
		});
		return combined;
	}


	private static openExternalLinksInDefaultBrowser = (
		event: Electron.Event,
		contents: Electron.WebContents
	) => {
		// Disabling creation of new windows
		contents.setWindowOpenHandler((handler: Electron.HandlerDetails) => {
			// Telling the user platform to open this event's url in the default browser
			shell.openExternal(handler.url);

			// Blocking this event from loading in current app
			return { action: 'deny' };
		});

		// Limiting navigation
		contents.on(
			'will-navigate',
			(event: Electron.Event, navigationUrl: string) => {
				const parsedUrl = new URL(navigationUrl);
				// Allowing local navigation only
				if (parsedUrl.origin !== 'http://localhost:4200') {
					event.preventDefault();
				}
			}
		);
	};
}
