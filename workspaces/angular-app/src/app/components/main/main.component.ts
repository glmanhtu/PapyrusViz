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

import { Component, Inject, Input, OnInit, QueryList, ViewChildren } from '@angular/core';
import {
  BroadcastService,
  PROJECT_BROADCAST_SERVICE_TOKEN,
} from '../../services/broadcast.service';
import {
  AssemblingDTO,
  GetAssemblingRequest,
  ImgDto,
  ProjectDTO, Thumbnail,
} from 'shared-lib';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { NgbNav, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { PanelComponent } from '../panel/panel.component';
import { BoardMainComponent } from './board/board.main.component';

@Component({
  selector: 'app-main',
  providers: [NgbNav],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

  @ViewChildren(BoardMainComponent) boardComponents: QueryList<BoardMainComponent>;
  projectDto: ProjectDTO | null = null;
  assemblings: AssemblingDTO[] = [];
  active: number;

  @Input()
  panel: PanelComponent;

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private eIpc: ElectronIpcService) {
  }

  getActivatedBoard(): BoardMainComponent {
    for (let i = 0; i < this.boardComponents.length; i++) {
      if (this.boardComponents!.get(i)!.assembling.id === this.active) {
        return this.boardComponents.get(i)!;
      }
    }
    throw new Error('Board component not found!')
  }
  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.initProject(projectDto);
    });
  }

  addImage(thumbnail: Thumbnail) {
    this.getActivatedBoard().addImage(thumbnail)
  }

  initProject(projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.eIpc.send<string, AssemblingDTO[]>('assembling:get-assemblings', projectDto.path).then((assemblings) => {
      this.assemblings = assemblings;
    });

    this.eIpc.send<string, number>('assembling:get-activated-assembling-id', projectDto.path).then((assemblingId) => {
      this.active = assemblingId;
    })
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.eIpc.send<GetAssemblingRequest, void>('assembling:set-activated-assembling-id', {
      projectPath: this.projectDto!.path,
      assemblingId: changeEvent.nextId
    })
  }

  close(event: MouseEvent, _: number) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  add(event: MouseEvent) {
    event.preventDefault();
    this.eIpc.send<string, AssemblingDTO>('assembling:create-assembling', this.projectDto!.path).then((assemblingDto) => {
      this.assemblings.push(assemblingDto);
      this.active = assemblingDto.id;
    });
  }

  findMatching(img: ImgDto) {
    this.panel.findMatching(img);
  }
}
