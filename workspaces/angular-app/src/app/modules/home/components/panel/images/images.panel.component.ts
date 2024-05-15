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

import { AfterViewInit, Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  AssemblingImage,
  CategoryDTO, ContextAction, ImageRequest, ImgDto,
  ProjectDTO,
  ThumbnailRequest,
  ThumbnailResponse,
} from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-images-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './images.panel.component.html',
  styleUrls: ['./images.panel.component.scss'],
})
export class ImagesPanelComponent implements OnInit, AfterViewInit {

  @Input()
  projectDto: ProjectDTO | null = null;

  @Input()
  categories: CategoryDTO[] = [];

  @Output()
  openImage = new EventEmitter<ImgDto>();

  @Output()
  queryImage = new EventEmitter<ImgDto>();

  category = new FormControl(1);
  filter = new FormControl('');
  currentPage = 0;
  thumbnails: ImgDto[] = [];
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.

  constructor(
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
  }

  handleImageChange(imgDto: ImgDto) {
    const idx = this.thumbnails.findIndex(x => x.id === imgDto.id);
    if (idx !== -1) {
      this.thumbnails[idx] = imgDto;
    }
  }

  ngAfterViewInit() {
    this.getThumbnails();
  }

  loadData() {
    this.getThumbnails(this.currentPage + 1, false);
  }

  async getThumbnails(page = 0, reset = true) {
    if (this.isLoading || (this.isCompleted && !reset)) {
      return;
    }
    this.isLoading = true;
    const thumbnailRequest: ThumbnailRequest = {
      projectPath: this.projectDto!.path,
      categoryId: this.category.value!,
      filter: this.filter.value!,
      page: page,
      perPage: 20
    }
    this.eIpc.send<ThumbnailRequest, ThumbnailResponse>('image:get-thumbnails', thumbnailRequest).then((result) => {
      if (reset) {
        this.thumbnails.length = 0;
        this.isCompleted = false;
      }
      if (result.thumbnails.length === 0) {
        this.isCompleted = true;
      }
      this.thumbnails.push(...result.thumbnails);
      this.currentPage = page;
      this.isLoading = false;
    }).catch((err) => {
      console.log(err);
      this.isLoading = false;
      this.isCompleted = true;
      this.thumbnails.length = 0;
    })
  }

  contextMenu(thumbnail: ImgDto, idx: number) {
    this.eIpc.send<ImageRequest, ContextAction<AssemblingImage>>('menu:context:get-thumbnail-context', {
      projectPath: this.projectDto!.path,
      imgId: thumbnail.id
    }).then(x => {
      switch (x.name) {
        case 'similarity':
          this.queryImage.emit(thumbnail);
          break;

        case 'open':
          this.openImage.emit(thumbnail);
          break

        case 'archive':
          this.eIpc.send<ImageRequest, void>('image:archive', { projectPath: this.projectDto!.path, imgId: thumbnail.id}).then(() => {
            this.thumbnails.splice(idx, 1);
          })
          break;

        case 'unarchive':
          this.eIpc.send<ImageRequest, void>('image:unarchive', { projectPath: this.projectDto!.path, imgId: thumbnail.id}).then(() => {
            this.thumbnails.splice(idx, 1);
          })
          break;
      }
    })
  }
}
