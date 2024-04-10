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

import { Component, EventEmitter, Input, OnInit, Output } from '@angular/core';
import {
  AssemblingImage,
  CategoryDTO, ContextAction, ImageRequest,
  MatchingImgRequest, MatchingRequest,
  MatchingResponse,
  ProjectDTO, Thumbnail,
  ThumbnailResponse,
} from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../../similarity/creation/similarity.creation.component';
import { FormControl } from '@angular/forms';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-matching-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './matching.panel.component.html',
  styleUrls: ['./matching.panel.component.scss'],
})
export class MatchingPanelComponent implements OnInit {

  @Input()
  projectDto: ProjectDTO;

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;

  @Output()
  openImage = new EventEmitter<Thumbnail>();

  @Input()
  categories: CategoryDTO[] = [];
  category = new FormControl(1);

  matchings: MatchingResponse[] = [];
  thumbnails: Thumbnail[] = [];
  activatedMatching: MatchingResponse | undefined;

  queryImgId: number;

  currentPage = 0;
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.


  constructor(
    private eIpc: ElectronIpcService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.initMatchings()
  }

  initMatchings() {
    this.eIpc.send<string, MatchingResponse[]>('matching:get-matchings', this.projectDto!.path).then((matchings) => {
      this.matchings = matchings;
    });

    this.eIpc.send<string, MatchingResponse>('matching:get-activated-matching', this.projectDto!.path).then((matching) => {
      this.activatedMatching = matching;
    });

    this.thumbnails.length = 0;
  }

  findMatching(img: {id: number}) {
    this.queryImgId = img.id
    this.getThumbnails();
  }

  createMatching() {
    this.modalService.similarityCreation(this.projectDto).result.then((x) => {
      if (x) {
        this.initMatchings();
      }
    })
  }

  loadData() {
    this.getThumbnails(this.currentPage + 1, false);
  }

  setActivatedMatching(matching: MatchingResponse) {
    this.eIpc.send<MatchingRequest, void>('matching:set-activated-matching', {
      projectPath: this.projectDto.path,
      matchingId: matching.id
    }).then(() => {
      this.activatedMatching = matching;
      this.thumbnails = [];
    })
  }

  deleteMatching(matching: MatchingResponse) {
    this.eIpc.send<MatchingRequest, void>('matching:delete-matching', {
      projectPath: this.projectDto.path,
      matchingId: matching.id
    }).then(() => {
      this.matchings = this.matchings.filter(x => x.id !== matching.id);
      if (this.matchings.length > 0) {
        if (this.activatedMatching === undefined || this.activatedMatching.id === matching.id) {
          this.setActivatedMatching(this.matchings[0]);
        }
      } else {
        this.activatedMatching = undefined;
      }
      this.thumbnails = [];
    })
  }

  contextMenu(thumbnail: Thumbnail, idx: number) {
    this.eIpc.send<ImageRequest, ContextAction<AssemblingImage>>('menu:context:get-thumbnail-context', {
      projectPath: this.projectDto!.path,
      imgId: thumbnail.imgId
    }).then(x => {
      switch (x.name) {
        case 'similarity':
          this.findMatching({id: thumbnail.imgId})
          break;

        case 'open':
          this.openImage.emit(thumbnail);
          break

        case 'archive':
          this.eIpc.send<ImageRequest, void>('image:archive', { projectPath: this.projectDto!.path, imgId: thumbnail.imgId}).then(() => {
            this.thumbnails.splice(idx, 1);
          })
          break;

        case 'unarchive':
          this.eIpc.send<ImageRequest, void>('image:unarchive', { projectPath: this.projectDto!.path, imgId: thumbnail.imgId}).then(() => {
            this.thumbnails.splice(idx, 1);
          })
          break;
      }
    })
  }

  getThumbnails(page = 0, reset = true) {
    if (!this.activatedMatching || !this.queryImgId || this.isLoading || (this.isCompleted && !reset)) {
      return;
    }
    this.isLoading = true;
    const thumbnailRequest: MatchingImgRequest = {
      projectPath: this.projectDto.path,
      categoryId: this.category.value!,
      matchingId: this.activatedMatching.id,
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
    });
  }
}
