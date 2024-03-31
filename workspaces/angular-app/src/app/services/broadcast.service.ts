import { Observable, OperatorFunction, Subject } from 'rxjs';
import { InjectionToken, NgZone } from '@angular/core';
import { ProjectDTO } from 'shared-lib';


export const PROJECT_BROADCAST_SERVICE_TOKEN = new InjectionToken<BroadcastService<ProjectDTO>>('projectBroadcastService');


/**
 * Custom OperatorFunction that makes sure that all lifecycle hooks of an Observable
 * are running in the NgZone.
 */
function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
	return (source) => {
		return new Observable(observer => {
			return source.subscribe({
				next: (value: T) => zone.run(() => observer.next(value)),
				error: (e: unknown) => zone.run(() => observer.error(e)),
				complete: () => zone.run(() => observer.complete())
			});
		});
	};
}

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