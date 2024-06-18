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

import {
  Component,
  ElementRef,
  EventEmitter,
  HostListener,
  Input,
  OnInit,
  Output,
  QueryList,
  ViewChild,
  ViewChildren,
} from '@angular/core';
import {
  AssemblingDTO,
  AssemblingImage,
  GetAssemblingRequest,
  GlobalTransform,
  ImgDto,
  ProjectDTO,
  Transforms, VerifyItem,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { FrameComponent } from '../../../../../shared/components/frame/frame.component';
import { ModalService } from '../../../../../services/modal.service';
import { PanelComponent } from '../../panel/panel.component';

@Component({
  selector: 'app-board-main',
  host: {
    class: 'h-100 w-100'
  },
  templateUrl: './board.main.component.html',
  styleUrls: ['./board.main.component.scss'],
})
export class BoardMainComponent implements OnInit {

  @Input() assembling: AssemblingDTO;
  @Input() projectDto: ProjectDTO;
  @Input() panel: PanelComponent;

  @ViewChildren(FrameComponent) frameComponents!: QueryList<FrameComponent>;
  @Output() queryImage = new EventEmitter<ImgDto>();
  @ViewChild("boardContainer") boardContainer: ElementRef<HTMLDivElement>;
  @ViewChild("panZoom") panZoom: ElementRef<HTMLDivElement>;
  @ViewChild("frameAnchor") frameAnchor: ElementRef<HTMLDivElement>;

  @Output() segmentImage = new EventEmitter<ImgDto>();

  assemblingImages: AssemblingImage[] = [];
  selectedFrames = new Map<number, FrameComponent>;
  menuItems = ['Vers l\'avant', 'Vers l\'arrière', 'Supprimer']
  gt = [
    ['0567a_r', '0567i_r'],
    ['0567i_r', '0567j_r'],
    ['1189_r', '0567e_r'],
    ['0786_r', '1243_r'],
    ['0812a_r', '2275_r'],
    ['2275_r', '0812b_r']
  ]
  checkThreshold = 0.2;

  constructor(
    private modalService: ModalService,
    private eIpc: ElectronIpcService) {
  }

  ngOnInit(): void {
    if (sessionStorage.getItem('assembling')) {
      this.assemblingImages = JSON.parse(sessionStorage.getItem('assembling')!);
    } else {
      this.eIpc.send<GetAssemblingRequest, AssemblingImage[]>('assembling:get-images',
        { projectPath: this.projectDto!.path, assemblingId: this.assembling.id }).then((items) => {
        this.assemblingImages = items;
      });
    }
  }

  saveSession() {
    sessionStorage.setItem('assembling', JSON.stringify(this.assemblingImages));
  }

  onDragOver(event: DragEvent) {
    event.preventDefault();
  }

  onDrop(event: DragEvent) {
    event.preventDefault();
    const data = event.dataTransfer!.getData('text/plain');
    const thumbnail: ImgDto = JSON.parse(data);

    // Get the bounding rectangle of the boardContainer element
    const rect = this.panZoom.nativeElement.getBoundingClientRect();
    const anchorRect = this.frameAnchor.nativeElement.getBoundingClientRect();

    // Calculate the drop position relative to the panZoom element
    let x = event.clientX - rect.left;
    let y = event.clientY - rect.top;

    const containerTransforms = this.assembling.transforms;
    const deltaX = anchorRect.x - rect.left
    const deltaY = anchorRect.y - rect.top
    x = (x - deltaX) / containerTransforms.scale
    y = (y - deltaY) / containerTransforms.scale

    this.addImage(thumbnail, y, x);
  }

  resetView() {
    const elem = this.boardContainer.nativeElement;
    const panZoomElem = this.panZoom.nativeElement;
    // elem.style.transform = 'scale(1)';
    // this.assembling.transforms.scale = 1;

    let minLeft = 99999;
    let minTop = 9999999;
    for (const frame of this.frameComponents) {
      if (minLeft > frame.transforms.left) {
        minLeft = frame.transforms.left
        minTop = frame.transforms.top
      }
    }

    for (const frame of this.frameComponents) {
      frame.transforms.left -= minLeft
      frame.transforms.top -= minTop
    }


    elem.style.left = `0`;
    elem.style.top = `0`;

    panZoomElem.style.transformOrigin = '0 0';
  }

  addImage(thumbnail: ImgDto, top = 10, left= 10) {
    const imgWidths = []
    if (this.frameComponents.length === 0) {
      const containerRect = this.boardContainer.nativeElement.getBoundingClientRect();
      imgWidths.push(containerRect.width);
    }
    for (const frame of this.frameComponents) {
      if (frame.image.id === thumbnail.id) {
        this.selectedFrames.forEach((x, key) => {
          x.showController = false;
          this.selectedFrames.delete(key);
        })
        frame.showController = true;
        this.selectedFrames.set(frame.image.id, frame);

        return;
      }
      imgWidths.push(frame.image.width * frame.transforms.scale)
    }
    const avgWidth = imgWidths.reduce((p, c) => p + c, 0) / imgWidths.length;
    let imgScale = (avgWidth / thumbnail.width);
    if (imgScale === 0) {
      imgScale = 1;
    }

    if (top !== 10 || left !== 10) {
      top = top - (thumbnail.height * imgScale / 2);
      left = left - (thumbnail.width * imgScale / 2);
    }

    const x: AssemblingImage = {
      img: thumbnail,
      transforms: {
        zIndex: 1 + this.assemblingImages.reduce((acc, x) => Math.max(acc, x.transforms.zIndex), 0),
        top: top,
        left: left,
        scale: imgScale,
        rotation: 0
      }
    };

    this.assemblingImages.push(x);
    this.saveSession();
  }

  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: MouseEvent): void {
    let hasSelected = false;
    this.frameComponents.forEach((item) => {
      if (item.isMouseSelected(event)) {
        if (event.button === 2) {
          item.contextMenuEvent.emit();
        }

        const isMultiSelect = this.selectedFrames.size >= 2 && this.selectedFrames.has(item.image.id)

        if (!event.shiftKey && !isMultiSelect) {
          this.selectedFrames.forEach((x, key) => {
            if (x.image.id !== item.image.id) {
              x.showController = false;
            }
            this.selectedFrames.delete(key);
          })
        }
        item.showController = true;
        this.selectedFrames.set(item.image.id, item);
        hasSelected = true;
      }
    });

    this.selectedFrames.forEach((x, key) => {
      if (!hasSelected) {
        x.showController = false;
        this.selectedFrames.delete(key);
      } else {
        // Perform dragging
        x.currentFrameDrag(event);
      }
    });
  }

  handleContextMenu(imgIdx: number, command: string): void {
    const assemblingImage = this.assemblingImages[imgIdx];
    switch (command) {
      case 'Supprimer':
        this.assemblingImages = this.assemblingImages.filter((x) => x.img.id != assemblingImage.img.id)
        break

      case 'Vers l\'avant':
        this.toFront(assemblingImage);
        break

      case 'Vers l\'arrière':
        this.toBack(assemblingImage);
        break
    }
  }

  toFront(assemblingImg: AssemblingImage) {
    const maxZIndex = this.assemblingImages.reduce((acc, x) => Math.max(acc, x.transforms.zIndex), -9999999);
    assemblingImg.transforms.zIndex = maxZIndex + 1;
    this.onTransform(assemblingImg, assemblingImg.transforms)
  }

  toBack(assemblingImg: AssemblingImage) {
    const minZIndex = this.assemblingImages.reduce((acc, x) => Math.min(acc, x.transforms.zIndex), 9999999);
    assemblingImg.transforms.zIndex = minZIndex - 1;
    this.onTransform(assemblingImg, assemblingImg.transforms)
  }

  onGlobalTransform(globalTransform: GlobalTransform) {
    this.assembling.transforms = globalTransform;
  }

  onTransform(_a: AssemblingImage, _t: Transforms) {
    this.saveSession();
  }

  getTransform(assemblingImage: AssemblingImage) {
    return assemblingImage.transforms;
  }

  verifyAssembling() {
    const category = this.panel.thumbnailsPanel.category;
    let dataType = "IR"
    if (parseInt(`${category.value}`) === 1) {
      dataType = "CL"
    }
    const assemblingMap = new Map<string, AssemblingImage>();
    this.assemblingImages.forEach((x) => {
      assemblingMap.set(x.img.name, x);
    });
    const correct: VerifyItem[] = [], incorrect: VerifyItem[] = [];
    for (const pair of this.gt) {
      const img1 = assemblingMap.get(pair[0] + '_' + dataType);
      const img2 = assemblingMap.get(pair[1] + '_' + dataType);
      if (!img1 || !img2) {
        incorrect.push({dataType, pair});
        continue;
      }
      const minHeight = Math.min(img1.img.height * img1.transforms.scale, img2.img.height * img2.transforms.scale);
      const minWidth = Math.min(img1.img.width * img1.transforms.scale, img2.img.width * img2.transforms.scale);
      const bottomDiff = Math.abs(img1.transforms.top + img1.img.height * img1.transforms.scale - img2.transforms.top) / minHeight;
      const rightDiff = Math.abs(img1.transforms.left + img1.img.width * img1.transforms.scale - (img2.transforms.left + img2.img.width * img2.transforms.scale)) / minWidth;
      const leftDiff = Math.abs(img1.transforms.left - img2.transforms.left) / minWidth;

      if (bottomDiff < this.checkThreshold && rightDiff < this.checkThreshold && leftDiff < this.checkThreshold) {
        correct.push({dataType, pair});
      } else {
        incorrect.push({dataType, pair});
      }
    }
    console.log('Correct: ', correct);
    console.log('Incorrect: ', incorrect);
    this.modalService.verifyModal(correct, incorrect)
  }

  clearDrawing() {
    sessionStorage.removeItem('assembling');
    this.assemblingImages.length = 0;
  }
}
