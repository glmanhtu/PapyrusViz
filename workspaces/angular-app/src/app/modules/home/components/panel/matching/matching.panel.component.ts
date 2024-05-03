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

import { Component, EventEmitter, Input, OnInit, Output, ViewChild } from '@angular/core';
import {
  AssemblingImage,
  CategoryDTO, ContextAction, ImageRequest, ImgDto,
  MatchingImgRequest,
  ProjectDTO,
  ThumbnailResponse,
} from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../../../../../shared/components/similarity/creation/similarity.creation.component';
import { FormControl } from '@angular/forms';
import { MatchingButtonComponent } from '../../../../../shared/components/matching-button/matching-button.component';

@Component({
  selector: 'app-matching-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './matching.panel.component.html',
  styleUrls: ['./matching.panel.component.scss'],
})
export class MatchingPanelComponent implements OnInit {

  @Input()
  projectDto: ProjectDTO;

  @ViewChild(MatchingButtonComponent)
  matchingComponent: MatchingButtonComponent;

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;

  @Output()
  openImage = new EventEmitter<ImgDto>();

  @Input()
  categories: CategoryDTO[] = [];
  category = new FormControl(1);

  thumbnails: ImgDto[] = [];

  queryImgId: number | undefined = undefined;

  currentPage = 0;
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.


  constructor(
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
  }

  findMatching(img: {id: number}) {
    this.queryImgId = img.id
    this.getThumbnails();
  }

  loadData() {
    this.getThumbnails(this.currentPage + 1, false);
  }

  contextMenu(thumbnail: ImgDto, idx: number) {
    this.eIpc.send<ImageRequest, ContextAction<AssemblingImage>>('menu:context:get-thumbnail-context', {
      projectPath: this.projectDto!.path,
      imgId: thumbnail.id
    }).then(x => {
      switch (x.name) {
        case 'similarity':
          this.findMatching({id: thumbnail.id})
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

  async getThumbnails(page = 0, reset = true) {
    if (!this.matchingComponent.activatedMatching || this.queryImgId === undefined || this.isLoading || (this.isCompleted && !reset)) {
      return;
    }
    this.isLoading = true;
    const thumbnailRequest: MatchingImgRequest = {
      projectPath: this.projectDto.path,
      categoryId: this.category.value!,
      matchingId: this.matchingComponent.activatedMatching.id,
      imgId: this.queryImgId,
      page: page,
      perPage: 20
    }
    this.eIpc.send<MatchingImgRequest, ThumbnailResponse>('matching:find-matching-imgs', thumbnailRequest).then((result) => {
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
      console.error(err);
      this.isLoading = false;
      this.isCompleted = true;
      this.thumbnails.length = 0;
    })
  }
}
