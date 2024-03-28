import { app, BrowserWindow, ipcMain, shell } from 'electron';
import { Window } from './window';
import { BaseHandler } from '../handlers/base.handler';
import { IMessage } from 'shared-lib';

export class App {
	private static _wrapper: Window;

	public static launch(callback: (mainWin: BrowserWindow) => void): void {
		app.on('window-all-closed', App.quit);
		app.whenReady().then(() => {
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
				try {
					const response = await handlerFunction(payload);
					event.reply(`ipc-response:${requestId}`, { status: 'success', payload: response });
				} catch (error) {
					event.reply(`ipc-response:${requestId}`, { status: 'error', payload: error.message });
				}
			} else {
				event.reply(`ipc-response:${requestId}`, { status: 'error', payload: 'Handler not found' });
			}
		});


		const combinedContinuousMap = this.combineContinuousRoutes(...handlers);
		ipcMain.on('ipc-continuous-request', async (event,  message: { type: string; payload: unknown; requestId: string }) => {
			const { type, payload, requestId } = message;
			const handlerFunction = combinedContinuousMap.get(type);
			if (handlerFunction) {
				await handlerFunction(payload, (message) => {
					event.reply(`ipc-continuous-response:${requestId}`, message)
				});
			} else {
				event.reply(`ipc-continuous-response:${requestId}`, { status: 'error', payload: 'Handler not found' });
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
