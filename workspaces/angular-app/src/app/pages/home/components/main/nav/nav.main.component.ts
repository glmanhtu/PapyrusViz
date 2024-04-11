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

import {
  AfterViewInit,
  Component, EventEmitter,
  Input,
  OnInit, Output,
} from '@angular/core';
import {
  AssemblingDTO, ContextAction, PRequest,
  ProjectDTO,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { FormControl } from '@angular/forms';
import { ModalService } from '../../../../../services/modal.service';

@Component({
  selector: 'app-nav-main',
  templateUrl: './nav.main.component.html',
  styleUrls: ['./nav.main.component.scss'],
})
export class NavMainComponent implements OnInit, AfterViewInit {

  @Input() assembling: AssemblingDTO;
  @Input() projectDto: ProjectDTO;

  @Output() closeAssembling = new EventEmitter<AssemblingDTO>();

  isEditModel = false;
  assemblingName = new FormControl('');

  constructor(private eIpc: ElectronIpcService, private modalService: ModalService) {
  }

  ngAfterViewInit(): void {
    this.assemblingName.setValue(this.assembling.name);
  }

  ngOnInit(): void {
  }

  updateAssembling(assembling: AssemblingDTO) {
    return this.eIpc.send<PRequest<AssemblingDTO>, void>('assembling:update-assembling', {
      projectPath: this.projectDto.path,
      payload: assembling
    })
  }

  rename(event: KeyboardEvent): void {
    if (event.key === 'Escape') {
      this.assemblingName.setValue(this.assembling.name);
      this.isEditModel = false;
    } else if (event.key === 'Enter') {
      const newAssembling = {...this.assembling, name: this.assemblingName.value!}
      this.updateAssembling(newAssembling).then(() => {
        this.assembling = newAssembling;
        this.isEditModel = false;
      })
    }
  }

  close() {
    this.modalService.warning(
      `Assembling deletion`,
      `Are you sure you want to delete ${this.assembling.name} assembling?`,
      `All information associated to this assembling will be permanently deleted. This operation can not be undone !`
    ).then((res) => {
      if (res) {
        this.eIpc.send<PRequest<number>, void>('assembling:close-assembling', {
          projectPath: this.projectDto.path,
          payload: this.assembling.id
        }).then(() => {
          this.closeAssembling.emit(this.assembling);
        });
      }
    })
  }

  tabContextMenu() {
    this.eIpc.send<void, ContextAction<AssemblingDTO>>('menu:context:get-assembling-context', undefined).then(x => {
      switch (x.name) {
        case 'rename':
          this.isEditModel = true;
          break;
        case 'close':
          this.close();
      }
    })
  }
}
