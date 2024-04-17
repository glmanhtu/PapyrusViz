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

import { Directive, ElementRef, EventEmitter, HostListener, Input, OnInit, Output } from '@angular/core';
import { GlobalTransform } from 'shared-lib';
import { parseInt } from 'lodash';

@Directive({
	selector: "[appPanZoom]",
})
export class PanZoomDirective implements OnInit{

	@Input()
	globalTransform: GlobalTransform

	@Input()
	hasFrameSelected: boolean;

	@Input()
	container: HTMLDivElement;

	last = {
		x: 0,
		y: 0
	}

	@Output()
	changes = new EventEmitter<GlobalTransform>();

	constructor(private element: ElementRef) {}

	@HostListener("wheel", ["$event"])
	public onScroll(event: WheelEvent) {
		event.preventDefault();
		event.stopPropagation();
		const container = this.container;
		const scale = this.globalTransform.scale
		const rect = container.getBoundingClientRect();
		const mouseX = event.clientX - rect.left;
		const mouseY = event.clientY - rect.top;

		// Zoom in or out
		const direction = event.deltaY < 0 ? 1 : -1;
		const scaleFactor = 0.1;
		const scaleIncrement = direction * scaleFactor;
		const newScale = Math.max(0.1, Math.min(3, scale + scaleIncrement));

		// Adjust container position to keep mouse position fixed during zoom
		const dx = (mouseX - rect.width / 2) * (scaleIncrement / scale);
		const dy = (mouseY - rect.height / 2) * (scaleIncrement / scale);

		this.element.nativeElement.style.transformOrigin = `${mouseX}px ${mouseY}px`;
		container.style.transform = `scale(${newScale})`;

		// Adjust container position to keep mouse position fixed during zoom
		container.style.left = `${parseInt(container.style.left) - dx}px`;
		container.style.top = `${parseInt(container.style.top) - dy}px`;
		this.globalTransform.scale = newScale;
		this.globalTransform.origin = {x: mouseX, y: mouseY}
		this.changes.emit(this.globalTransform);
	}


	@HostListener("mousedown", ["$event"])
	onMouseDown(event: MouseEvent) {
		event.preventDefault();
	  // Start panning
	  this.last = { x: event.clientX, y: event.clientY };
	  const mouseMoveListener = (moveEvent: MouseEvent) => {
	    const dx = moveEvent.clientX - this.last.x;
	    const dy = moveEvent.clientY - this.last.y;
	    this.last = { x: moveEvent.clientX, y: moveEvent.clientY };
	    this.pan(dx, dy);
	  };
	  document.addEventListener('mousemove', mouseMoveListener);
	  document.addEventListener('mouseup', () => {
			this.changes.emit(this.globalTransform);
	    document.removeEventListener('mousemove', mouseMoveListener);
	  }, { once: true });
	}

	pan(dx: number, dy: number) {
		if (this.hasFrameSelected) {
			return;
		}
	  const el = this.container;
		const computedStyle = getComputedStyle(el);
		const left = parseInt(computedStyle.left) || 0;
		const top = parseInt(computedStyle.top) || 0;
		el.style.left = left + dx + 'px';
		el.style.top = top + dy + 'px';
		this.globalTransform.last = {x: left + dx, y: top + dy}
	}

	ngOnInit(): void {
		this.container.style.transform = `scale(${this.globalTransform.scale})`;
		const el = this.container;
		el.style.left = this.globalTransform.last.x + 'px';
		el.style.top = this.globalTransform.last.y + 'px';
		this.element.nativeElement.style.transformOrigin = `${this.globalTransform.origin.x}px ${this.globalTransform.origin.y}px`;
	}
}