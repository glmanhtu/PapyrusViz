// To secure user platform when running renderer process stuff,
// Node.JS and Electron remote APIs are only available in this script

import { contextBridge, ipcRenderer } from 'electron';
import { v4 as uuidv4 } from 'uuid';


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
			ipcRenderer.once(`ipc-response:${requestId}`, (_, response: { type: string; status: string;  payload: R | string }) => {
				if (response.type === type && response.status === 'success') {
					resolve(response.payload as R);
				} else {
					reject(new Error(response.payload as string));
				}
			});

			ipcRenderer.send('ipc-request', { type, payload, requestId });
		});
	}
});

console.log('The preload script has been injected successfully.');
