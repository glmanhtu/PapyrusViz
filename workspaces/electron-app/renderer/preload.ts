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
