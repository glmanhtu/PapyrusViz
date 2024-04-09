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

import { Component, Input, Output, EventEmitter, ViewChild, ElementRef } from '@angular/core';
import { IMessage, Progress } from 'shared-lib';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';


@Component({
  selector: 'app-progress',
  templateUrl: './progress.component.html',
  styleUrls: [ './progress.component.scss' ],
  providers: [NgbModalConfig, NgbModal]
})
export class ProgressComponent {

  @Input()
  title: string;

  @ViewChild('content') content : ElementRef;

  private modelRef: NgbModalRef | null = null;

  progress: Progress = {
    percentage: 0,
    title: '',
    description: ''
  }

  showComplete = false;

  errorMessage = '';

  showProgress = false;

  @Output()
  onComplete = new EventEmitter<void>();

  constructor(private eIpc: ElectronIpcService,
              private modalService: NgbModal,
              config: NgbModalConfig) {
    config.backdrop = 'static';
    config.keyboard = false;
  }

  onMessage(message: IMessage<Progress>) {
    if (message.status === 'success') {
      this.progress = message.payload as Progress;
    } else if (message.status === 'complete') {
      this.showComplete = true;
    } else {
      this.errorMessage += message.payload + '\n';
    }
  }

  show() {
    this.modelRef = this.modalService.open(this.content, { size: 'lg', centered: true });
    this.showProgress = true;
  }

  finish() {
    this.onComplete.emit();
    this.modelRef!.close();
  }
}