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

import { Component, Input, OnInit } from '@angular/core';
import {
  CategoryDTO,
  ImgDto,
  MatchingImgRequest,
  MatchingResponse,
  ProjectDTO, Thumbnail,
  ThumbnailResponse,
} from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../../similarity/creation/similarity.creation.component';
import { FormControl } from '@angular/forms';

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

  @Input()
  categories: CategoryDTO[] = [];
  category = new FormControl(1);

  matchings: MatchingResponse[] = [];
  thumbnails: Thumbnail[] = [];
  activatedMatching: MatchingResponse;

  imgDto: ImgDto;

  currentPage = 0;
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.


  constructor(
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
    this.eIpc.send<string, MatchingResponse[]>('matching:get-matchings', this.projectDto!.path).then((matchings) => {
      this.matchings = matchings;
    });

    this.eIpc.send<string, MatchingResponse>('matching:get-activated-matching', this.projectDto!.path).then((matching) => {
      this.activatedMatching = matching;
    });

  }

  findMatching(img: ImgDto) {
    this.imgDto = img
    this.getThumbnails();
  }

  createMatching() {
    this.similarityCreationComponent.open();
  }

  loadData() {
    this.getThumbnails(this.currentPage + 1, false);
  }

  getThumbnails(page = 0, reset = true) {
    if (!this.imgDto || this.isLoading || (this.isCompleted && !reset)) {
      return;
    }
    this.isLoading = true;
    const thumbnailRequest: MatchingImgRequest = {
      projectPath: this.projectDto.path,
      categoryId: this.category.value!,
      matchingId: this.activatedMatching.id,
      imgId: this.imgDto.id,
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
