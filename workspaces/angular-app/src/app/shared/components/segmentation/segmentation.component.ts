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

import { Component, OnInit } from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ImageRequest, ImgDto, ImgSegmentationRequest, ProjectDTO, SegmentationPoint } from 'shared-lib';
import { ElectronIpcService } from '../../../services/electron-ipc.service';

@Component({
  selector: 'app-segmentation-creation',
  templateUrl: './segmentation.component.html',
  styleUrls: ['./segmentation.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class SegmentationComponent implements OnInit {

  private modalRef: NgbModalRef | null = null;
  image: ImgDto;
  projectDto: ProjectDTO;
  foregroundPoints: SegmentationPoint[] = [];
  backgroundPoints: SegmentationPoint[] = [];
  base64Img: string | null = null;


  constructor(
    private electronIpc: ElectronIpcService,
  ) {}

  public loadImage(imageId: number, projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.electronIpc.send<ImgSegmentationRequest, string>('image:register-image-segmentation', { imgId: imageId, projectPath: projectDto.path, points: [] })
    this.electronIpc.send<ImageRequest, ImgDto>('image:get-image', { imgId: imageId, projectPath: projectDto.path }).then(img => {
      this.image = img;
    });
  }

  performSegment(event: MouseEvent, element: HTMLElement) {
    event.stopPropagation();
    event.preventDefault();
    const rect = element.getBoundingClientRect();
    const scale = this.image.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    console.log(x, y);
    if (event.button === 0) {
      this.foregroundPoints.push({ x, y, type: 1 });
    } else if(event.button === 2) {
      this.backgroundPoints.push({ x, y, type: 0 });
    }
    const points = this.foregroundPoints.concat(this.backgroundPoints);
    this.electronIpc.send<ImgSegmentationRequest, string>('image:segment-image', { imgId: this.image.id, projectPath: this.projectDto.path, points: points }).then(result => {
       this.base64Img = result;
    })
  }

  ngOnInit(): void {
  }

  onSubmit() {
  }

  cancel() {
    this.modalRef!.close();
  }

}
