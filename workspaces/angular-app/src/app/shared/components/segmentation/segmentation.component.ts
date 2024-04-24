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
  points: SegmentationPoint[] = [];


  constructor(
    private electronIpc: ElectronIpcService,
  ) {}

  public loadImage(imageId: number, projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.electronIpc.send<ImageRequest, ImgDto>('image:get-image', { imgId: imageId, projectPath: projectDto.path }).then(img => {
      this.image = img;
    });
  }

  performSegment(event: MouseEvent, element: HTMLElement) {
    const rect = element.getBoundingClientRect();
    const scale = this.image.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    console.log(x, y);
    this.points.push({ x, y, type: 1 });
    this.electronIpc.send<ImgSegmentationRequest, void>('image:segment-image', { imgId: this.image.id, projectPath: this.projectDto.path, points: this.points });
  }

  ngOnInit(): void {
  }

  onSubmit() {
  }

  cancel() {
    this.modalRef!.close();
  }

}
