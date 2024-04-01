import { Component, Input, OnInit } from '@angular/core';
import { AssemblingDTO, AssemblingImage, AssemblingImageRequest, ProjectDTO, Transforms } from 'shared-lib';
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
    this.eIpc.send<AssemblingImageRequest, AssemblingImage[]>('assembling:get-images',
      {projectPath: this.projectDto!.path, assemblingId: this.assembling.id}).then((items) => {
        this.assemblingImages = items;
        console.log(items);
    })
  }

  getStyle(transforms: Transforms) {
    return {
      'z-index': transforms.zIndex || 0,
      'transform': `rotate(${transforms.rotation || 0}deg)`,
      'top': `${transforms.top || 10}px`,
      'left': `${transforms.left || 10}px`
    }
  }
}
