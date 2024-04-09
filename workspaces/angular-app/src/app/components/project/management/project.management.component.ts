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

import { AfterViewInit, Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { ProjectCreationComponent } from '../creation/project.creation.component';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { ProjectInfo } from '../../../../../../electron-app/main/models/app-data';
import { Progress, ProjectDTO } from 'shared-lib';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../services/broadcast.service';
import { ProgressComponent } from '../../../shared/components/progress/progress.component';
import { ModalService } from '../../../services/modal.service';

@Component({
  selector: 'app-project-management',
  templateUrl: './project.management.component.html',
  styleUrls: ['./project.management.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class ProjectManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('content') content : ElementRef;
  @Input() projectCreation: ProjectCreationComponent;
  @ViewChild(ProgressComponent) progressComponent: ProgressComponent;
  private modelRef: NgbModalRef | null = null;

  projects: ProjectInfo[] = [];

  constructor(
    config: NgbModalConfig,
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private electronIpc: ElectronIpcService,
    private modalService: NgbModal,
    private notificationService: ModalService
  ) {
    // customize default values of modals used by this component tree
    config.backdrop = 'static';
    config.keyboard = false;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.open();
  }

  open(): void {
    if (this.modelRef !== null) {
      this.modelRef.close();
    }
    this.electronIpc.send<void, ProjectInfo[]>('project:get-projects', undefined).then((projects) => {
      this.projects = projects;
    });
    this.modelRef = this.modalService.open(this.content, { size: 'lg', centered: true });
  }

  createProject(): void {
    this.modelRef!.close();
    this.projectCreation.open();
  }

  migrateProject(projectPath: string) {
    this.progressComponent.onComplete.subscribe(() => {
      this.openProject(projectPath, false);
    })
    this.electronIpc.sendAndListen<string, Progress>('project::migrate-project', projectPath, (message) => {
      if (!this.progressComponent.showProgress) {
        if (message.status === 'success') {
          this.modelRef!.close();
          this.progressComponent.show();
        } else {
          this.notificationService.info(message.payload as string)
        }
      }
      if (this.progressComponent.showProgress) {
        this.progressComponent.onMessage(message);
      }
    });
  }

  openProject(projectPath: string, retryWithMigrate = true) {
    this.electronIpc.send<string, ProjectDTO>('project:load-project', projectPath).then((project) => {
      this.projectBroadcastService.publish(project);
      this.modelRef!.close();
    }).catch((err) => {
      if (err.message === 'Project does not exists!' && retryWithMigrate) {
        this.migrateProject(projectPath);
      }
    })
  }
}
