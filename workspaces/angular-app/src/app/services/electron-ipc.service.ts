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
import { ExtrasChannels, IMessage, WindowApi } from 'shared-lib';

@Injectable({
	providedIn: 'root',
})
export class ElectronIpcService {
	private _api!: WindowApi;
	private debounceTimeouts = new Map<string, number>();

	constructor(private ngZone: NgZone) {
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

	public debounce<P>(delay: number, ...keys: string[]) {
		return (type: string, payload: P) => {
			const key = type + '::' + keys.join('-');
			let timerId = this.debounceTimeouts.get(key)
			if (timerId) {
				clearTimeout(timerId);
			}
			timerId = setTimeout(() => {
				this.send<P, unknown>(type, payload)
				this.debounceTimeouts.delete(key)
			}, delay);
			this.debounceTimeouts.set(key, timerId);
		};
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

