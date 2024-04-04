import { Observable, Subject } from 'rxjs';
import { InjectionToken, NgZone } from '@angular/core';
import { ProjectDTO, Thumbnail } from 'shared-lib';
import { runInZone } from '../shared/pipes/run-in-zone';


export const PROJECT_BROADCAST_SERVICE_TOKEN = new InjectionToken<BroadcastService<ProjectDTO>>('projectBroadcastService');
export const IMG_BROADCAST_SERVICE_TOKEN = new InjectionToken<BroadcastService<Thumbnail>>('imgBroadcastService');


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