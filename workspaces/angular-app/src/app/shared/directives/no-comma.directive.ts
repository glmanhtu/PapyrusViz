import { Pipe, PipeTransform } from '@angular/core';

@Pipe({
	name: 'noComma'
})
export class NoCommaPipe implements PipeTransform {

	transform(value: string | null): string {
		if (typeof value === 'string') {
			return value.replace(/,/g, '');
		}
		return value || "";
	}
}