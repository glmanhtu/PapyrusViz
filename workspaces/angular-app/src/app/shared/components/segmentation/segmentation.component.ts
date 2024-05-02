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

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
  @ViewChild("mask") maskContainer: ElementRef<HTMLDivElement>;

  constructor(
    private electronIpc: ElectronIpcService,
  ) {}

  private showMask(show = true) {
    if (!this.maskContainer) {
      return;
    }
    if (show) {
      this.maskContainer.nativeElement.style.display = "flex";
    } else {
      this.maskContainer.nativeElement.style.display = "none";
    }
  }

  public loadImage(imageId: number, projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.showMask();
    Promise.all([
      this.electronIpc.send<ImgSegmentationRequest, string>('image:register-image-segmentation',
        { imgId: imageId, projectPath: projectDto.path, points: [] }),
      this.electronIpc.send<ImageRequest, ImgDto>('image:get-image', { imgId: imageId, projectPath: projectDto.path })
    ]).then(([_, img]) => {
      this.image = img;
      if (this.image.segmentationPoints.length > 0) {
        this.foregroundPoints = this.image.segmentationPoints.filter(p => p.type === 1);
        this.backgroundPoints = this.image.segmentationPoints.filter(p => p.type === 0);
        this.segment();

      } else {
        this.showMask(false);
      }
    });
  }

  performSegment(event: MouseEvent, element: HTMLElement) {
    event.stopPropagation();
    event.preventDefault();
    this.showMask();
    const rect = element.getBoundingClientRect();
    const scale = this.image.width / rect.width;
    const x = (event.clientX - rect.left) * scale;
    const y = (event.clientY - rect.top) * scale;
    if (event.button === 0) {
      this.foregroundPoints.push({ x, y, type: 1 });
    } else if(event.button === 2) {
      this.backgroundPoints.push({ x, y, type: 0 });
    }
    this.segment();
  }

  segment() {
    const points = this.foregroundPoints.concat(this.backgroundPoints);
    this.electronIpc.send<ImgSegmentationRequest, string>('image:detect-papyrus', { imgId: this.image.id, projectPath: this.projectDto.path, points: points }).then(result => {
      this.base64Img = result;
      this.showMask(false);
    })
  }


  ngOnInit(): void {
  }

  cancel() {
    this.modalRef!.close();
  }

  reset() {
    this.foregroundPoints.length = 0;
    this.backgroundPoints.length = 0;
    this.base64Img = null;
  }

  onSave() {
    const points = this.foregroundPoints.concat(this.backgroundPoints);
    this.showMask();
    this.electronIpc.send<ImgSegmentationRequest, ImgDto>('image:segment-papyrus', { imgId: this.image.id, projectPath: this.projectDto.path, points: points }).then(result => {
      this.showMask(false);
      this.modalRef!.close(result);
    })
  }
}
