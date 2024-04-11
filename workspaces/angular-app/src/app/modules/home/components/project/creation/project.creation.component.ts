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
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { FormControl, FormGroup } from '@angular/forms';
import { FileDialogRequest, FileDialogResponse, Progress, ProjectDTO } from 'shared-lib';
import { ProgressComponent } from '../../../../../shared/components/progress/progress.component';
import { ModalService } from '../../../../../services/modal.service';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../../../services/broadcast.service';

@Component({
  selector: 'app-project-creation',
  templateUrl: './project.creation.component.html',
  styleUrls: ['./project.creation.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class ProjectCreationComponent implements OnInit {
  title = 'Create Project'
  @ViewChild('content') content : ElementRef;
  @ViewChild(ProgressComponent) progressComponent: ProgressComponent;

  private modalRef: NgbModalRef | null = null;

  projectForm = new FormGroup({
    name: new FormControl(''),
    path: new FormControl(''),
    dataPath: new FormControl(''),
  });

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private modalService: ModalService,
    private electronIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
  }

  onSubmit() {
    const formValue = this.projectForm.value;
    const projectRequest: ProjectDTO = {
      name: formValue.name!,
      path: formValue.path!,
      dataPath: formValue.dataPath!
    }
    this.progressComponent.show();
    this.electronIpc.sendAndListen<ProjectDTO, Progress>('project::create-project', projectRequest, (message) => {
      this.progressComponent.onMessage(message);
    });
  }

  cancel() {
    this.modalRef!.close();
    this.modalService.projectManagement();
  }

  folderSelection(event: MouseEvent, allowCreation=false): void {
    event.preventDefault();
    event.stopPropagation();
    const formControlName = (event.target as Element).getAttribute('formControlName');
    this.electronIpc.send<FileDialogRequest, FileDialogResponse>(
      'dialogs:open-file-folder',
      { isFolder: true, allowFolderCreation: allowCreation, isMultiSelect: false, extensions: [] }).then((res) => {
        if (!res.canceled) {
          this.projectForm.get(formControlName!)!.setValue(res.filePaths[0]);
        }
    });
  }

  openProject(projectPath: string) {
    this.electronIpc.send<string, ProjectDTO>('project:load-project', projectPath).then((project) => {
      this.projectBroadcastService.publish(project);
      this.modalRef!.close();
    });
  }
}
