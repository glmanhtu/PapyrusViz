import { Injectable } from '@angular/core';
import { WindowApi } from 'shared-lib';

@Injectable({
	providedIn: 'root',
})
export class ElectronIpcService {
	private _api!: WindowApi;

	constructor() {
		if (window && (window as Window).api) {
			this._api = (window as Window).api;
			console.log('Preloader API has been loaded successfully');
		} else {
			console.warn('Preloader API is not loaded');
		}
	}

	public send<P, R>(type: string, payload: P): Promise<R> {
		return this._api.send<P, R>(type, payload);
	}
}
