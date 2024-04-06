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

// To secure user platform when running renderer process stuff,
// Node.JS and Electron remote APIs are only available in this script

import { contextBridge, ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';
import { Message } from 'shared-lib';


// So we expose protected methods that allow the renderer process
// to use the ipcRenderer without exposing the entire object
// Notice that we can also expose variables, not just functions
contextBridge.exposeInMainWorld('api', {
	node: () => process.versions.node,
	chrome: () => process.versions.chrome,
	electron: () => process.versions.electron,
	send: <P, R>(type: string, payload: P): Promise<R> => {
		const requestId = uuidv4();
		return new Promise<R>((resolve, reject) => {
			ipcRenderer.once(`ipc-response:${requestId}`, (_, response: Message<R>) => {
				if (response.status === 'success') {
					resolve(response.payload as R);
				} else {
					console.log(response);
					reject(new Error(response.payload as string));
				}
			});

			ipcRenderer.send('ipc-request', { type, payload, requestId });
		});
	},
	sendAndListen: <P, R>(type: string, payload: P,  listener: (message: Message<R>) => void) => {
		const requestId = uuidv4();
			ipcRenderer.on(`ipc-continuous-response:${requestId}`, (_, response: Message<R>) => {
				listener(response)
				if (response.status === 'error' || response.status === 'complete') {
					ipcRenderer.removeAllListeners(`ipc-continuous-response:${requestId}`);
				}
				if (response.status === 'error') {
					console.log(response);
				}
			});

			ipcRenderer.send('ipc-continuous-request', { type, payload, requestId });
	}
});

console.log('The preload script has been injected successfully.');
