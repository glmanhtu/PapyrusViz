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

import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { ProjectInfo } from '../../../../../../electron-app/main/models/app-data';
import { FileDialogRequest, FileDialogResponse, Progress, ProjectDTO } from 'shared-lib';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../services/broadcast.service';
import { ProgressComponent } from '../../../shared/components/progress/progress.component';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-project-management',
  templateUrl: './project.management.component.html',
  styleUrls: ['./project.management.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class ProjectManagementComponent implements OnInit {
  @ViewChild('content') content : ElementRef;
  @ViewChild(ProgressComponent) progressComponent: ProgressComponent;
  private modalRef: NgbModalRef | null = null;

  projects: ProjectInfo[] = [];

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private electronIpc: ElectronIpcService,
    private modalService: ModalService
  ) {
  }

  ngOnInit(): void {
    this.electronIpc.send<void, ProjectInfo[]>('project:get-projects', undefined).then((projects) => {
      this.projects = projects;
    });
  }

  createProject(): void {
    this.modalRef!.close();
    this.modalService.projectCreation();
  }

  migrateProject(projectPath: string) {
    this.progressComponent.onComplete.subscribe(() => {
      this.openProject(projectPath, false);
    })
    this.electronIpc.sendAndListen<string, Progress>('project::migrate-project', projectPath, (message) => {
      if (!this.progressComponent.showProgress) {
        if (message.status === 'success') {
          this.progressComponent.showProgress = true;
        } else {
          this.modalService.info(message.payload as string)
        }
      }
      if (this.progressComponent.showProgress) {
        this.progressComponent.onMessage(message);
      }
    });
  }

  quit() {
    this.electronIpc.send<void, void>('app:quit', undefined).then(() => {
    });
  }


  deleteProject(project: ProjectInfo) {
    this.modalService.warning(
      `Project deletion`,
      `Are you sure you want to delete ${project.projName} project?`,
      `All information associated to this project will be permanently deleted. This operation can not be undone !`
    ).then((res) => {
      if (res) {
        this.electronIpc.send<string, void>('project:delete-project', project.projPath).then(() => {
          this.projects = this.projects.filter((x) => x.projPath !== project.projPath)
        })
      }
    })
  }

  openProject(projectPath: string, retryWithMigrate = true) {
    this.electronIpc.send<string, ProjectDTO>('project:load-project', projectPath).then((project) => {
      this.projectBroadcastService.publish(project);
      this.modalRef!.close();
    }).catch((err) => {
      if (err.message === 'Project does not exists!' && retryWithMigrate) {
        this.migrateProject(projectPath);
      }
    })
  }

  selectProject() {
    this.electronIpc.send<FileDialogRequest, FileDialogResponse>(
      'dialogs:open-file-folder',
      { isFolder: true, allowFolderCreation: false, isMultiSelect: false, extensions: [] }).then((res) => {
      if (!res.canceled) {
        this.openProject(res.filePaths[0]);
      }
    })
  }
}
