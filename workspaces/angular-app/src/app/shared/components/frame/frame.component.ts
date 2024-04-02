import { Component, ElementRef, Inject, Input, ViewChild, Output, EventEmitter } from '@angular/core';
import { DOCUMENT } from '@angular/common';
import { ImgDto } from 'shared-lib/.dist/models/img';
import { Transforms } from 'shared-lib';

export type ResizeAnchorType =
  | 'top'
  | 'left'
  | 'bottom'
  | 'right'

export type ResizeDirectionType =
  | 'x'
  | 'y'
  | 'xy';

@Component({
  selector: 'app-frame',
  templateUrl: './frame.component.html',
  styleUrls: [ './frame.component.scss' ]
})
export class FrameComponent {

  @ViewChild('wrapper') wrapperRef!: ElementRef;
  @ViewChild('resizeCorner') resizeCornerRef!: ElementRef;

  @Input()
  image: ImgDto;

  @Input()
  transforms: Transforms;

  @Output()
  transformEvent = new EventEmitter<Transforms>();


  minSize: { w: number, h: number } = { w: 200, h: 200 };

  isResizing = false;


  constructor(@Inject(DOCUMENT) private _document: Document,
              private _el: ElementRef) { }

  startDrag($event: MouseEvent): void {
    $event.preventDefault();
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


  // Need to reimplement this function
  // Because after the rotation, the positions of anchors are no longer correct
  startResize($event: MouseEvent, anchors: ResizeAnchorType[], direction: ResizeDirectionType): void {
    $event.preventDefault();
    const mouseX = $event.clientX;
    const mouseY = $event.clientY;
    const lastX = this.transforms.left;
    const lastY = this.transforms.top;
    const dimensionWidth: number = this.resizeCornerRef.nativeElement.parentNode.offsetWidth;
    const dimensionHeight: number = this.resizeCornerRef.nativeElement.parentNode.offsetHeight;

    const duringResize = (e: MouseEvent) => {
      let dw = dimensionWidth
      let dh = dimensionHeight;

      if (direction === 'x' || direction === 'xy') {
        if (anchors.includes('left')) {
          dw += ( mouseX - e.clientX );
        } else if (anchors.includes('right')) {
          dw -= ( mouseX - e.clientX );
        }
        dh = dimensionHeight * dw / dimensionWidth;
        this.transforms.scale = dh / this.image.height;
      }
      else if (direction === 'y' || direction === 'xy') {
        if (anchors.includes('top')) {
          dh += ( mouseY - e.clientY );
        } else if (anchors.includes('bottom')) {
          dh -= ( mouseY - e.clientY );
        }
        dw = dimensionWidth * dh / dimensionHeight;
        this.transforms.scale = dw / this.image.width;
      }

      if (anchors.includes('left')) {
        this.transforms.left = lastX + e.clientX - mouseX;
      }

      if (anchors.includes('top')) {
        this.transforms.top = lastY + e.clientY - mouseY;
      }
    };

    const finishResize = (_: MouseEvent) => {
      this._document.removeEventListener('mousemove', duringResize);
      this._document.removeEventListener('mouseup', finishResize);
      this.transformEvent.emit(this.transforms);
    };

    this._document.addEventListener('mousemove', duringResize);
    this._document.addEventListener('mouseup', finishResize);
  }


  startRotate($event: MouseEvent, anchors: ResizeAnchorType[], direction: ResizeDirectionType): void {
    $event.preventDefault();
    if (direction !== 'xy') {
      return;
    }
    const mouseX = $event.clientX;
    const mouseY = $event.clientY
    const dimensionWidth: number = this.resizeCornerRef.nativeElement.parentNode.offsetWidth;
    const dimensionHeight: number = this.resizeCornerRef.nativeElement.parentNode.offsetHeight;
    const centerX = parseInt(this.resizeCornerRef.nativeElement.parentNode.offsetLeft + dimensionWidth / 2)
    const centerY = parseInt(this.resizeCornerRef.nativeElement.parentNode.offsetTop + dimensionHeight / 2)
    const lastRadians = Math.atan2(centerX - mouseX, centerY - mouseY);
    const lastDegree = (lastRadians * (180 / Math.PI) * -1) + 100;
    const rotation = this.transforms.rotation

    const duringRotate = (e: MouseEvent) => {
      if (anchors.includes('top') && anchors.includes('left')) {
        const radians = Math.atan2(centerX - e.clientX, centerY - e.clientY);
        const degree = (radians * (180 / Math.PI) * -1) + 100;
        const degreeChange = lastDegree - degree
        this.transforms.rotation = rotation + degreeChange;
      }

    };

    const finishRotate = (_: MouseEvent) => {
      this._document.removeEventListener('mousemove', duringRotate);
      this._document.removeEventListener('mouseup', finishRotate);
      this.transformEvent.emit(this.transforms);
    };

    this._document.addEventListener('mousemove', duringRotate);
    this._document.addEventListener('mouseup', finishRotate);
  }
}