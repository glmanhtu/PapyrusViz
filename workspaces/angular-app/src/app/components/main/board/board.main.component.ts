import { Component, Input, OnInit } from '@angular/core';
import {
  AssemblingDTO,
  AssemblingImage,
  AssemblingImageChangeRequest, AssemblingImageRequest, ContextAction,
  GetAssemblingRequest,
  ProjectDTO,
  Transforms,
} from 'shared-lib';
import { ElectronIpcService } from '../../../services/electron-ipc.service';

@Component({
  selector: 'app-board-main',
  templateUrl: './board.main.component.html',
  styleUrls: ['./board.main.component.scss'],
})
export class BoardMainComponent implements OnInit {

  @Input() assembling: AssemblingDTO;
  @Input() projectDto: ProjectDTO;

  assemblingImages: AssemblingImage[] = [];

  constructor(
    private eIpc: ElectronIpcService) {
  }
  ngOnInit(): void {
    this.eIpc.send<GetAssemblingRequest, AssemblingImage[]>('assembling:get-images',
      {projectPath: this.projectDto!.path, assemblingId: this.assembling.id}).then((items) => {
        this.assemblingImages = items;
        console.log(items);
    })
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
    }).then(() => {
      console.log(assemblingImage, transforms);
    }).catch((err) => {
      console.error(err);
    })
  }
}
