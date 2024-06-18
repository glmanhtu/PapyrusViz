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

import { Component, Inject, Input, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../../services/broadcast.service';
import {
  AssemblingExportRequest,
  FileSaveResponse,
  Progress,
  ProjectDTO,
} from 'shared-lib';
import { MainComponent } from '../main/main.component';
import { ElectronIpcService } from '../../../../services/electron-ipc.service';
import { ModalService } from '../../../../services/modal.service';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  projectDto: ProjectDTO;

  @Input()
  mainComponent: MainComponent;

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private modalService: ModalService,
    private eIpc: ElectronIpcService) {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.projectDto = projectDto;
    });
  }

  ngOnInit(): void {
    console.log('NavComponent INIT');
  }

  openSimilarityWindow() {
    this.eIpc.send<string, void>('app:open-similarity', this.projectDto.path);
  }

  resetView()  {
    const currentBoard = this.mainComponent.getActivatedBoard();
    currentBoard.resetView();
  }

  exportImg() {
    const currentBoard = this.mainComponent.getActivatedBoard();
    const assembling = currentBoard.assembling;
    const fileNameSuggestion = assembling.name + '.png';
    this.eIpc.send<string, FileSaveResponse>('dialogs:open-file-save', fileNameSuggestion).then((res) => {
      if (!res.canceled) {
        const progress = this.modalService.progress('Image Export')
        const request: AssemblingExportRequest = {
          projectPath: this.projectDto.path,
          assemblingId: assembling.id,
          outputFile: res.filePath!
        }
        this.eIpc.sendAndListen<AssemblingExportRequest, Progress>('assembling::export-img', request, (message) => {
          progress.onMessage(message);
        });
      }
    })
  }

  verifyAssembling() {
    const currentBoard = this.mainComponent.getActivatedBoard();
    currentBoard.verifyAssembling();
  }

  clearDrawing() {
    const currentBoard = this.mainComponent.getActivatedBoard();
    currentBoard.clearDrawing();
  }

  showSuggestion() {
    const category = this.mainComponent.panel.thumbnailsPanel.category;
    let imgType = "IR"
    if (parseInt(`${category.value}`) === 1) {
      imgType = "CL"
    }
    this.modalService.showSuggestion(imgType)
  }
}
