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

import { Component, Input, OnInit } from '@angular/core';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';
import { ElectronIpcService } from '../../../services/electron-ipc.service';

@Component({
  selector: 'app-confirm-modal',
  templateUrl: './view-logs.component.html',
  styleUrls: [ './view-logs.component.scss' ],
})
export class ViewLogsComponent implements OnInit {

  @Input()
  title: string;

  @Input()
  headline: string;

  @Input()
  description: string;

  logContent: string;

  private modalRef: NgbModalRef | null = null;

  constructor(
    private electronIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
    this.electronIpc.send<void, string>('app:get-logs', undefined).then((result) => {
      this.logContent = result;
    })
  }

  close(result: boolean) {
    this.modalRef?.close(result);
  }

  copyToClipboard() {
    navigator.clipboard.writeText(this.logContent);
  }
}