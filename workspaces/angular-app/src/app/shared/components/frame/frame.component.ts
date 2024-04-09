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

import { Component, ElementRef, Inject, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ImgDto } from 'shared-lib/.dist/models/img';
import { Transforms } from 'shared-lib';


@Component({
  selector: 'app-frame',
  templateUrl: './frame.component.html',
  styleUrls: [ './frame.component.scss' ],
})
export class FrameComponent {

  @ViewChild('wrapper') wrapperRef!: ElementRef;
  @ViewChild('resizeCorner') resizeCornerRef!: ElementRef;
  @ViewChild('imgElement') imgElementRef!: ElementRef;

  @Input()
  image: ImgDto;

  @Input()
  transforms: Transforms;

  @Output()
  transformEvent = new EventEmitter<Transforms>();

  @Output()
  contextMenuEvent = new EventEmitter<void>();

  showController = false;
  minSize: { w: number, h: number } = { w: 200, h: 200 };

  isResizing = false;
  isRotating = false;

  constructor(@Inject(DOCUMENT) private _document: Document) {
  }

  isMouseSelected(event: MouseEvent): boolean {
    return this.wrapperRef.nativeElement.contains(event.target)
  }

  currentFrameDrag($event: MouseEvent): void {
    $event.preventDefault();
    if ($event.button !== 0) {
      return;
    }

    if (this.isResizing || this.isRotating) {
      return;
    }
    const mouseX = $event.clientX;
    const mouseY = $event.clientY;

    const positionX = this.transforms.left;
    const positionY = this.transforms.top;

    const duringDrag = (e: MouseEvent) => {
      const dx = e.clientX - mouseX;
      const dy = e.clientY - mouseY;
      this.transforms.left = positionX + dx;
      this.transforms.top = positionY + dy;
    };

    const finishDrag = (_: MouseEvent) => {
      this._document.removeEventListener('mousemove', duringDrag);
      this._document.removeEventListener('mouseup', finishDrag);
      this.transformEvent.emit(this.transforms);
    };

    this._document.addEventListener('mousemove', duringDrag);
    this._document.addEventListener('mouseup', finishDrag);
  }

  generateEvenlyDistribution(min: number, max: number, n: number) { // min and max included
    const step = Math.floor(max - min) / n || 1;
    const result = [];
    for (let i = min; i <= max; i += step) {
      result.push(i)
    }
    return result;
  }


  // Need to reimplement this function
  // Because after the rotation, the positions of anchors are no longer correct
  startResize($event: MouseEvent): void {
    $event.preventDefault();
    if ($event.button !== 0) {
      return;
    }

    if (this.isRotating) {
      return;
    }
    this.isResizing = true;
    const mouseX = $event.clientX;
    const mouseY = $event.clientY;
    const lastX = this.transforms.left;
    const lastY = this.transforms.top;

    const dimensionWidth: number = this.resizeCornerRef.nativeElement.parentNode.offsetWidth;
    const dimensionHeight: number = this.resizeCornerRef.nativeElement.parentNode.offsetHeight;
    const clientRect = this.resizeCornerRef.nativeElement.parentNode.getBoundingClientRect();
    const centerX = parseInt(clientRect.left + clientRect.width / 2)
    const centerY = parseInt(clientRect.top + clientRect.height / 2)


    const targetElement = $event.target as Element;
    const rect = targetElement.getBoundingClientRect();
    const targetXs = this.generateEvenlyDistribution(rect.left, rect.right, 10);
    const targetYs = this.generateEvenlyDistribution(rect.top, rect.bottom, 10);
    const diffX = targetXs.reduce((acc, x) => acc + x - centerX, 0);
    const diffY = targetYs.reduce((acc, y) => acc + y - centerY, 0)
    const sumX = targetXs.reduce((acc, x) => acc + x - rect.left, 0);
    const sumY = targetYs.reduce((acc, y) => acc + y - rect.top, 0);

    const duringResize = (e: MouseEvent) => {
      let dw = dimensionWidth
      let dh = dimensionHeight;

      if (sumY > sumX) {
        // Left or right handler
        if (diffX < 0) {
          dw += ( mouseX - e.clientX );
        } else {
          dw -= ( mouseX - e.clientX );
        }
        dh = dimensionHeight * dw / dimensionWidth;
        this.transforms.scale = dh / this.image.height;
      }
      else {
        if (diffY < 0) {
          dh += ( mouseY - e.clientY );
        } else {
          dh -= ( mouseY - e.clientY );
        }
        dw = dimensionWidth * dh / dimensionHeight;
        this.transforms.scale = dw / this.image.width;
      }

      if (diffX < 0) {
        this.transforms.left = lastX + e.clientX - mouseX;
      }

      if (diffY < 0) {
        this.transforms.top = lastY + e.clientY - mouseY;
      }
    };

    const finishResize = (_: MouseEvent) => {
      this._document.removeEventListener('mousemove', duringResize);
      this._document.removeEventListener('mouseup', finishResize);
      this.transformEvent.emit(this.transforms);
      this.isResizing = false;
    };

    this._document.addEventListener('mousemove', duringResize);
    this._document.addEventListener('mouseup', finishResize);
  }


  startRotate($event: MouseEvent): void {
    $event.preventDefault();
    if ($event.button !== 0) {
      return;
    }

    this.isRotating = true;
    const mouseX = $event.clientX;
    const mouseY = $event.clientY
    const clientRect = this.resizeCornerRef.nativeElement.parentNode.getBoundingClientRect();
    const centerX = parseInt(clientRect.left + clientRect.width / 2)
    const centerY = parseInt(clientRect.top + clientRect.height / 2)


    const lastRadians = Math.atan2(centerX - mouseX, centerY - mouseY);
    const lastDegree = (lastRadians * (180 / Math.PI) * -1) + 100;
    const rotation = this.transforms.rotation

    const duringRotate = (e: MouseEvent) => {
      const radians = Math.atan2(centerX - e.clientX, centerY - e.clientY);
      const degree = (radians * (180 / Math.PI) * -1) + 100;
      const degreeChange = lastDegree - degree
      this.transforms.rotation = rotation - degreeChange;
    };

    const finishRotate = (_: MouseEvent) => {
      this._document.removeEventListener('mousemove', duringRotate);
      this._document.removeEventListener('mouseup', finishRotate);
      this.transformEvent.emit(this.transforms);
      this.isRotating = false;
    };

    this._document.addEventListener('mousemove', duringRotate);
    this._document.addEventListener('mouseup', finishRotate);
  }
}