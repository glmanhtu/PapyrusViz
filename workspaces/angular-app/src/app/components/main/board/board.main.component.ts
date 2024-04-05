import { Component, HostListener, Inject, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import {
  AssemblingDTO,
  AssemblingImage,
  AssemblingImageChangeRequest, AssemblingImageRequest, ContextAction,
  GetAssemblingRequest,
  ProjectDTO, Thumbnail,
  Transforms,
} from 'shared-lib';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { BroadcastService, IMG_BROADCAST_SERVICE_TOKEN } from '../../../services/broadcast.service';
import { FrameComponent } from '../../../shared/components/frame/frame.component';

@Component({
  selector: 'app-board-main',
  templateUrl: './board.main.component.html',
  styleUrls: ['./board.main.component.scss'],
})
export class BoardMainComponent implements OnInit {

  @Input() assembling: AssemblingDTO;
  @Input() projectDto: ProjectDTO;

  @ViewChildren(FrameComponent) frameComponents!: QueryList<FrameComponent>;

  assemblingImages: AssemblingImage[] = [];
  selectedFrames = new Map<number, FrameComponent>;


  constructor(
    @Inject(IMG_BROADCAST_SERVICE_TOKEN) private imgBroadcastService: BroadcastService<Thumbnail>,
    private eIpc: ElectronIpcService) {
  }
  ngOnInit(): void {
    this.eIpc.send<GetAssemblingRequest, AssemblingImage[]>('assembling:get-images',
      {projectPath: this.projectDto!.path, assemblingId: this.assembling.id}).then((items) => {
        this.assemblingImages = items;
        console.log(items);
    });
    this.imgBroadcastService.observe().subscribe((thumbnail) => {
      if (this.assemblingImages.some((x) => x.img.id === thumbnail.imgId)) {
        return;
      }
      this.eIpc.send<AssemblingImageChangeRequest, AssemblingImage>('assembling:create-assembling-img', {
        projectPath: this.projectDto.path,
        assemblingId: this.assembling.id,
        imageId: thumbnail.imgId,
        transforms: {
          zIndex: 1 + this.assemblingImages.reduce((acc, x) => Math.max(acc, x.transforms.zIndex), 0),
          top: 10,
          left: 10,
          scale: 1,
          rotation: 0
        }
      }).then((x) => {
        this.assemblingImages.push(x);
      })
    })
  }

  @HostListener('document:mousedown', ['$event'])
  onGlobalClick(event: MouseEvent): void {
    let hasSelected = false;
    this.frameComponents.forEach((item) => {
      if (item.isMouseSelected(event)) {
        item.showController = true;
        if (event.button === 2) {
          item.contextMenuEvent.emit();
          return;
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
        this.selectedFrames.set(item.image.id, item);
        hasSelected = true;
      }
    });

    // Perform dragging
    this.selectedFrames.forEach((x, key) => {
      if (!hasSelected) {
        x.showController = false;
        this.selectedFrames.delete(key);
      } else {
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
          delete this.assemblingImages[imgIdx];
          this.assemblingImages = this.assemblingImages.filter((x) => x.img.id != assemblingImage.img.id)
          break
      }
    })
  }

  onTransform(assemblingImage: AssemblingImage, transforms: Transforms) {
    this.eIpc.send<AssemblingImageChangeRequest, void>('assembling:update-assembling-img', {
      projectPath: this.projectDto.path,
      assemblingId: this.assembling.id,
      imageId: assemblingImage.img.id,
      transforms: transforms
    });
  }
}
