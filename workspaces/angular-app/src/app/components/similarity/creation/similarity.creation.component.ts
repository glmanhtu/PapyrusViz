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

import { Component, ElementRef, OnInit, ViewChild } from '@angular/core';
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
import { ProgressComponent } from '../../../shared/components/progress/progress.component';

@Component({
  selector: 'app-similarity-creation',
  templateUrl: './similarity.creation.component.html',
  styleUrls: ['./similarity.creation.component.scss'],
})
export class SimilarityCreationComponent implements OnInit {
  @ViewChild('content') content : ElementRef;
  private modalRef: NgbModalRef | null = null;
  private projectDto: ProjectDTO;

  @ViewChild(ProgressComponent) progressComponent: ProgressComponent;

  matchingForm = new FormGroup({
    matchingName: new FormControl(''),
    matchingFile: new FormControl(''),
    matchingType: new FormControl(MatchingType.DISTANCE),
    matchingMethod: new FormControl(MatchingMethod.NAME),
  });

  constructor(
    private electronIpc: ElectronIpcService,
  ) {
  }

  ngOnInit(): void {
  }

  onSubmit() {
    const formValue = this.matchingForm.value;

    const request = {
      projectPath: this.projectDto.path,
      matchingName: formValue.matchingName!,
      matchingFile: formValue.matchingFile!,
      matchingMethod: formValue.matchingMethod!,
      matchingType: formValue.matchingType!
    }
    this.electronIpc.sendAndListen<MatchingDto, Progress>('matching::create-matching', request, (message) => {
      this.progressComponent.show();
      this.progressComponent.onMessage(message);
    });
  }

  finished() {
    this.modalRef!.close(true);
  }

  cancel() {
    this.modalRef!.close(false);
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
