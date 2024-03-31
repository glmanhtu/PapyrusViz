import { NgZone } from '@angular/core';
import { Observable, OperatorFunction } from 'rxjs';

/**
 * Custom OperatorFunction that makes sure that all lifecycle hooks of an Observable
 * are running in the NgZone.
 */
export function runInZone<T>(zone: NgZone): OperatorFunction<T, T> {
	return (source) => {
		return new Observable(observer => {
			return source.subscribe({
				next: (value: T) => zone.run(() => observer.next(value)),
				error: (e: unknown) => zone.run(() => observer.error(e)),
				complete: () => zone.run(() => observer.complete()),
			});
		});
	};
}