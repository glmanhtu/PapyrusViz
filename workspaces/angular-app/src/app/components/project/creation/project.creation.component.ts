import { Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { ProjectManagementComponent } from '../management/project.management.component';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { FormControl, FormGroup } from '@angular/forms';
import { FileDialogRequest, FileDialogResponse, Progress, ProjectDTO } from 'shared-lib';

@Component({
  selector: 'app-project-creation',
  templateUrl: './project.creation.component.html',
  styleUrls: ['./project.creation.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class ProjectCreationComponent implements OnInit {
  @ViewChild('content') content : ElementRef;
  @Input() projectManagement: ProjectManagementComponent;
  private modelRef: NgbModalRef | null = null;

  projectForm = new FormGroup({
    projectName: new FormControl(''),
    datasetPath: new FormControl(''),
    projectPath: new FormControl(''),
  });

  progress: Progress | null = null;
  showProgress = false;

  constructor(
    config: NgbModalConfig,
    private modalService: NgbModal,
    private electronIpc: ElectronIpcService,
  ) {
    // customize default values of modals used by this component tree
    config.backdrop = 'static';
    config.keyboard = false;
  }

  ngOnInit(): void {
  }

  open(): void {
    this.modelRef = this.modalService.open(this.content, { size: 'lg', centered: true });
  }

  onSubmit() {
    const formValue = this.projectForm.value;
    const projectRequest: ProjectDTO = {
      name: formValue.projectName!,
      path: formValue.projectPath!,
      dataPath: formValue.datasetPath!
    }
    this.showProgress = true;
    this.electronIpc.sendAndListen<ProjectDTO, Progress>('project::create-project', projectRequest, (message) => {
      if (message.status === 'success') {
       this.progress = message.payload as Progress;
      }
    });
  }

  cancel() {
    this.modelRef!.close();
    this.projectManagement.open();
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
}
