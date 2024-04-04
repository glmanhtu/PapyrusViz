import { Component, ElementRef, Inject, OnInit, ViewChild } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { FormControl, FormGroup } from '@angular/forms';
import {
  FileDialogRequest,
  FileDialogResponse,
  MatchingDto,
  MatchingMethod,
  MatchingType, Progress,
  ProjectDTO,
} from 'shared-lib';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../../services/broadcast.service';

@Component({
  selector: 'app-similarity-creation',
  templateUrl: './similarity.creation.component.html',
  styleUrls: ['./similarity.creation.component.scss'],
  providers: [NgbModal]
})
export class SimilarityCreationComponent implements OnInit {
  @ViewChild('content') content : ElementRef;
  private modelRef: NgbModalRef | null = null;
  private projectDto: ProjectDTO;
  showProgress = false;
  isFinished = false;
  progress: Progress = {
    title: 'Creating Project',
    description: '',
    percentage: 0
  }

  matchingForm = new FormGroup({
    matchingName: new FormControl(''),
    matchingFile: new FormControl(''),
    matchingType: new FormControl(MatchingType.DISTANCE),
    matchingMethod: new FormControl(MatchingMethod.NAME),
  });

  constructor(
    private modalService: NgbModal,
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private electronIpc: ElectronIpcService,
  ) {
    projectBroadcastService.observe().subscribe((project) => {
      this.projectDto = project;
    })
  }

  ngOnInit(): void {
  }

  open(): void {
    this.modelRef = this.modalService.open(this.content, { size: 'lg', centered: true });
  }

  onSubmit() {
    const formValue = this.matchingForm.value;

    this.showProgress = true;
    const request = {
      projectPath: this.projectDto.path,
      matchingName: formValue.matchingName!,
      matchingFile: formValue.matchingFile!,
      matchingMethod: formValue.matchingMethod!,
      matchingType: formValue.matchingType!
    }
    this.electronIpc.sendAndListen<MatchingDto, Progress>('matching::create-matching', request, (message) => {
      if (message.status === 'success') {
        this.progress = message.payload as Progress;
      } else if (message.status === 'complete') {
        this.isFinished = true;
      } else {
        console.log(message);
      }
    });
  }

  cancel() {
    this.modelRef!.close();
  }

  folderSelection(event: MouseEvent): void {
    event.preventDefault();
    event.stopPropagation();
    const formControlName = (event.target as Element).getAttribute('formControlName');
    this.electronIpc.send<FileDialogRequest, FileDialogResponse>(
      'dialogs:open-file-folder',
      { isFolder: false, allowFolderCreation: false, isMultiSelect: false, extensions: ['csv'] }).then((res) => {
        if (!res.canceled) {
          this.matchingForm.get(formControlName!)!.setValue(res.filePaths[0]);
        }
    });
  }
}
