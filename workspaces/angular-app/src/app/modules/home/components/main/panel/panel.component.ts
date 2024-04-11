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

import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../../../services/broadcast.service';
import { CategoryDTO, ProjectDTO, Thumbnail } from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../../../../../shared/components/similarity/creation/similarity.creation.component';
import { ImagesPanelComponent } from './images/images.panel.component';
import { MatchingPanelComponent } from './matching/matching.panel.component';
import { MainComponent } from '../main.component';

@Component({
  selector: 'app-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  private scrollThreshold = 100; // Adjust this value as needed

  @ViewChild('thumbnails') thumbnailsPanel: ImagesPanelComponent;

  @ViewChild('matching') matchingPanel: MatchingPanelComponent;

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;

  @Input()
  mainComponent: MainComponent;

  scrollTop = new Map<number, number>;

  active = 1;
  projectDto: ProjectDTO;
  categories: CategoryDTO[] = [];

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.projectDto = projectDto;
      this.eIpc.send<string, CategoryDTO[]>('category:get-categories', projectDto.path).then((categories) => {
        this.categories = categories;
      });
    });
  }

  openImage(thumbnail: Thumbnail) {
    this.mainComponent.addImage(thumbnail)
  }

  onScroll() {
    const element = this.scrollContainer.nativeElement;
    const closeToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + this.scrollThreshold;
    if (closeToBottom) {
      if (this.active === 1) {
        this.thumbnailsPanel.loadData();
      } else if (this.active === 2) {
        this.matchingPanel.loadData();
      }
    }
  }

  findMatching(img: {id: number}) {
    this.active = 2;
    this.matchingPanel.findMatching(img);
  }
}
