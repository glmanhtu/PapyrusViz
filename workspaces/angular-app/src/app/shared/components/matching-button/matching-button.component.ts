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
import { MatchingRequest, MatchingResponse, ProjectDTO, Thumbnail } from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-matching-button',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './matching-button.component.html',
  styleUrls: ['./matching-button.component.scss'],
})
export class MatchingButtonComponent implements OnInit {

  matchings: MatchingResponse[] = [];
  thumbnails: Thumbnail[] = [];
  activatedMatching: MatchingResponse | undefined;

  @Input()
  projectDto: ProjectDTO;

  constructor(
    private eIpc: ElectronIpcService,
    private modalService: ModalService
  ) {}

  ngOnInit(): void {
    this.initMatchings();
  }


  onScroll() {
  }

  createMatching() {
    this.modalService.similarityCreation(this.projectDto).result.then((x: boolean) => {
      if (x) {
        this.initMatchings();
      }
    })
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

  initMatchings() {
    this.eIpc.send<string, MatchingResponse[]>('matching:get-matchings', this.projectDto!.path).then((matchings) => {
      this.matchings = matchings;
    });

    this.eIpc.send<string, MatchingResponse>('matching:get-activated-matching', this.projectDto!.path).then((matching) => {
      this.activatedMatching = matching;
    });

    this.thumbnails.length = 0;
  }
}
