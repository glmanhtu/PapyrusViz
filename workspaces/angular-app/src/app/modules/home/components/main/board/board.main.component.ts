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
  AssemblingImageChangeRequest,
  AssemblingImageRequest,
  ContextAction,
  GetAssemblingRequest,
  GlobalTransform,
  ImgDto,
  PRequest,
  ProjectDTO,
  Transforms,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { FrameComponent } from '../../../../../shared/components/frame/frame.component';
import { ModalService } from '../../../../../services/modal.service';

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

  @ViewChildren(FrameComponent) frameComponents!: QueryList<FrameComponent>;
  @Output() queryImage = new EventEmitter<ImgDto>();
  @ViewChild("boardContainer") boardContainer: ElementRef<HTMLDivElement>;
  @ViewChild("panZoom") panZoom: ElementRef<HTMLDivElement>;
  @ViewChild("frameAnchor") frameAnchor: ElementRef<HTMLDivElement>;

  @Output() segmentImage = new EventEmitter<ImgDto>();

  assemblingImages: AssemblingImage[] = [];
  selectedFrames = new Map<number, FrameComponent>;

  constructor(
    private modalService: ModalService,
    private eIpc: ElectronIpcService) {
  }

  ngOnInit(): void {
    this.eIpc.send<GetAssemblingRequest, AssemblingImage[]>('assembling:get-images',
      {projectPath: this.projectDto!.path, assemblingId: this.assembling.id}).then((items) => {
        this.assemblingImages = items;
    });
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
    elem.style.left = '0';
    elem.style.top = '0';
    panZoomElem.style.transformOrigin = '50% 50%';
  }

  commandListener(command: string) {
    switch (command) {
      case "main:menu:img-delete":
        this.selectedFrames.forEach((frame, key) => {
          this.deleteAssemblingImg(frame.image.id).then(() => {
            frame.showController = false;
            this.assemblingImages = this.assemblingImages.filter((x) => x.img.id != frame.image.id)
            this.selectedFrames.delete(key);
          })
        });
        break;
      case "main:menu:img-find-similarity":
        if (this.selectedFrames.size > 1) {
          this.modalService.info("Only one image can be selected to find similarity!");
        } else if (this.selectedFrames.size === 1) {
          this.selectedFrames.forEach((frame) => {
            this.queryImage.emit(frame.image);
          });
        }
        break;

      case "main:menu:select-all":
        this.frameComponents.forEach((item) => {
          item.showController = true;
          this.selectedFrames.set(item.image.id, item);
        });
        break;

      case "main:menu:view-logs":
        this.modalService.viewLogs();
        break;

      case "main:menu:about":
        this.modalService.about();
        break;
    }
  }

  addImage(thumbnail: ImgDto, top = 10, left= 10) {
    const imgHeights = []
    if (this.frameComponents.length === 0) {
      const containerRect = this.boardContainer.nativeElement.getBoundingClientRect();
      imgHeights.push(containerRect.height);
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
      imgHeights.push(frame.image.height * frame.transforms.scale)
    }
    const avgHeight = imgHeights.reduce((p, c) => p + c, 0) / imgHeights.length;
    let imgScale = (avgHeight / thumbnail.height);
    if (imgScale === 0) {
      imgScale = 1;
    }

    if (top !== 10 || left !== 10) {
      top = top - (thumbnail.height * imgScale / 2);
      left = left - (thumbnail.width * imgScale / 2);
    }

    this.eIpc.send<AssemblingImageChangeRequest, AssemblingImage>('assembling:create-assembling-img', {
      projectPath: this.projectDto.path,
      assemblingId: this.assembling.id,
      imageId: thumbnail.id,
      transforms: {
        zIndex: 1 + this.assemblingImages.reduce((acc, x) => Math.max(acc, x.transforms.zIndex), 0),
        top: top,
        left: left,
        scale: imgScale,
        rotation: 0
      }
    }).then((x) => {
      this.assemblingImages.push(x);
    })
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

  handleContextMenu(imgIdx: number): void {
    const assemblingImage = this.assemblingImages[imgIdx];
    this.eIpc.send<AssemblingImageRequest, ContextAction<AssemblingImage>>('menu:context:get-image-context', {
      projectPath: this.projectDto.path,
      imageId: assemblingImage.img.id,
      assemblingId: this.assembling.id
    }).then(x => {
      switch (x.name) {
        case 'replace':
          this.assemblingImages[imgIdx] = x.data;
          break
        case 'delete':
          this.deleteAssemblingImg(assemblingImage.img.id).then(() => {
            this.assemblingImages = this.assemblingImages.filter((x) => x.img.id != assemblingImage.img.id)
          })
          break
        case 'similarity':
          this.queryImage.emit(assemblingImage.img);
          break;

        case 'to_front':
          this.toFront(assemblingImage);
          break

        case 'to_back':
          this.toBack(assemblingImage);
          break

        case 'open_file_location':
          const imgPath = assemblingImage.img.fragment === '' ? assemblingImage.img.path : assemblingImage.img.fragment;
          this.eIpc.send<string, void>('dialogs:open-file-location', imgPath.replace('atom://', ''));
          break

        case 'segment':
          this.modalService.imageSegmentation(this.projectDto, assemblingImage.img.id).result.then((res: ImgDto) => {
            if (res) {
              const prevImgHeight = assemblingImage.img.height * assemblingImage.transforms.scale;
              assemblingImage.img = res;
              assemblingImage.transforms.scale = prevImgHeight / res.height;
              this.onTransform(assemblingImage, assemblingImage.transforms);
              this.segmentImage.emit(res);
            }
          })
          break
      }
    })
  }

  toFront(assemblingImg: AssemblingImage) {
    const maxZIndex = this.assemblingImages.reduce((acc, x) => Math.max(acc, x.transforms.zIndex), -9999999);
    assemblingImg.transforms.zIndex = maxZIndex + 1;
    return this.onTransform(assemblingImg, assemblingImg.transforms);
  }

  toBack(assemblingImg: AssemblingImage) {
    const minZIndex = this.assemblingImages.reduce((acc, x) => Math.min(acc, x.transforms.zIndex), 9999999);
    assemblingImg.transforms.zIndex = minZIndex - 1;
    return this.onTransform(assemblingImg, assemblingImg.transforms);
  }

  deleteAssemblingImg(assemblingImgId: number) {
    return this.eIpc.send<AssemblingImageRequest, void>('assembling:delete-assembling-img', {
      projectPath: this.projectDto.path,
      assemblingId: this.assembling.id,
      imageId: assemblingImgId
    })
  }

  onGlobalTransform(globalTransform: GlobalTransform) {
    this.eIpc.debounce<PRequest<AssemblingDTO>>(1000, this.projectDto.path, this.assembling.id.toString())('assembling:update-assembling', {
      projectPath: this.projectDto.path,
      payload: {
        ...this.assembling,
        transforms: globalTransform
      }
    });

    this.assembling.transforms = globalTransform;
  }

  onTransform(assemblingImage: AssemblingImage, transforms: Transforms) {
    return this.eIpc.debounce<AssemblingImageChangeRequest>(1000, this.projectDto.path, this.assembling.id.toString(), assemblingImage.img.id.toString())('assembling:update-assembling-img', {
      projectPath: this.projectDto.path,
      assemblingId: this.assembling.id,
      imageId: assemblingImage.img.id,
      transforms: transforms
    });
  }
}
