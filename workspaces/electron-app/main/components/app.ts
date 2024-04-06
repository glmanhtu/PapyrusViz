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

import { app, BrowserWindow, ipcMain, shell, protocol, net } from 'electron';
import { Window } from './window';
import { BaseHandler } from '../handlers/base.handler';
import { IMessage } from 'shared-lib';
import { Message } from 'shared-lib/.dist/models/common';
import { Logger } from '../utils/logger';

export class App {
	private static _wrapper: Window;

	public static launch(callback: (mainWin: BrowserWindow) => void): void {
		app.on('window-all-closed', App.quit);
		app.whenReady().then(() => {
			protocol.handle('atom', (request) =>
				net.fetch('file://' + request.url.slice('atom://'.length)))
			App.start();
			callback(this.electronWindow);
		});

		// Limit navigation and open external links in default browser
		app.on('web-contents-created', App.openExternalLinksInDefaultBrowser);
	}

	public static get electronWindow(): BrowserWindow | undefined {
		return this._wrapper ? this._wrapper.electronWindow : undefined;
	}

	public static registerHandlers(handlers: BaseHandler[]) {
		const combinedRouteMap = this.combineRoutes(...handlers);
		ipcMain.on('ipc-request', async (event, message: { type: string; payload: unknown; requestId: string }) => {
			const { type, payload, requestId } = message;
			const handlerFunction = combinedRouteMap.get(type);
			if (handlerFunction) {
				handlerFunction(payload)
					.then((response) => {
						event.reply(`ipc-response:${requestId}`, Message.success(response));
					}).catch((err) => {
					Logger.error(err)
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
			if (handlerFunction) {
				handlerFunction(payload, async (message) => {
					event.reply(`ipc-continuous-response:${requestId}`, message);
				}).then(() => {
					event.reply(`ipc-continuous-response:${requestId}`, Message.complete(''));
				}).catch((err) => {
					Logger.error(err)
					event.reply(`ipc-continuous-response:${requestId}`, Message.error(err.message));
				});
			} else {
				event.reply(`ipc-continuous-response:${requestId}`, Message.error('Handler not found'));
			}
		})
	}

	private static start() {
		App._wrapper = new Window();
	}

	private static quit() {
		app.quit();
	}

	private static combineRoutes(...handlers: BaseHandler[]): Map<string, (payload: unknown) => Promise<unknown>> {
		const combined = new Map<string, (payload: unknown) => Promise<unknown>>();
		handlers.forEach(handler => {
			handler.getRoutes().forEach((value, key) => {
				combined.set(key, value);
			});
		});
		return combined;
	}

	private static combineContinuousRoutes(...handlers: BaseHandler[]): Map<string, (payload: unknown, listener: (message: IMessage<unknown>) => void) => Promise<void>> {
		const combined = new Map<string, (payload: unknown, listener: (message: IMessage<unknown>) => void) => Promise<void>>();
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
