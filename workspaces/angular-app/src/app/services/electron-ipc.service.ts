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

import { Injectable, NgZone } from '@angular/core';
import { ExtrasChannels, IMessage, ThumbnailRequest, ThumbnailResponse, WindowApi } from 'shared-lib';
import * as jsonData from "../../assets/app_data.json";
import { parseInt } from 'lodash';


@Injectable({
	providedIn: 'root',
})
export class ElectronIpcService {

	// See workspaces/electron-app/renderer/preload.ts for the implementation of WindowApi
	private _api!: WindowApi;
	private data = jsonData as any;

	constructor(private ngZone: NgZone) {
		if (window && (window as Window).api) {
			this._api = (window as Window).api;
			console.log('Preloader API has been loaded successfully');
		} else {
			console.warn('Preloader API is not loaded');
		}
	}

	public send<P, R>(type: string, payload: P): Promise<R> {
		if (this.data[type] !== undefined) {
			return new Promise((resolve, _) => {
				switch (type) {
					case 'image:get-thumbnails':
						const results = this.data[type]['response'] as ThumbnailResponse;
						const request = payload as ThumbnailRequest;
						const requestCategory = parseInt(`${request.categoryId}`)
						const thumbnails = results.thumbnails.filter(x => {
							let result = true;
							if (request.filter.length > 0) {
								result = result && x.name.includes(request.filter);
							}
							if (requestCategory !== 3) {
								result = result && x.categoryId === requestCategory;
							}
							return result;
						})
						resolve({thumbnails: thumbnails} as R)
						break
					default:
						resolve(this.data[type]['response']);
				}
			});
		}
		return this._api.send<P, R>(type, payload);
	}

	public sendAndListen<P, R>(type: string, payload: P, listener: (message: IMessage<R>) => void): void {
		this._api.sendAndListen<P, R>(type, payload, (message) => {
			this.ngZone.run(() => {
				listener(message);
			});
		});
	};

	public listen<R>(channel: ExtrasChannels, listener: (message: IMessage<R>) => void): void {
		this._api.listen<R>(channel, (message) => {
			this.ngZone.run(() => {
				listener(message);
			});
		});
	}
}

