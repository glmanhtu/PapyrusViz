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

import { Observable, Subject } from 'rxjs';
import { InjectionToken, NgZone } from '@angular/core';
import { ProjectDTO } from 'shared-lib';
import { runInZone } from '../shared/pipes/run-in-zone';


export const PROJECT_BROADCAST_SERVICE_TOKEN = new InjectionToken<BroadcastService<ProjectDTO>>('projectBroadcastService');

export class BroadcastService<T> {
	private onMessage = new Subject<T>();

	constructor(private ngZone: NgZone) {
	}

	publish(message: T): void {
		this.onMessage.next(message);
	}

	observe(): Observable<T> {
		return this.onMessage.pipe(
			runInZone(this.ngZone),
		);
	}
}