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
import {
  ExtrasChannels,
  IMessage,
  ProjectDTO,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'sim-main',
  providers: [NgbNav],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

  @Input()
  projectDto: ProjectDTO;

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngOnInit(): void {
    this.eIpc.listen<string>(ExtrasChannels.HOTKEY, this.hotKeyListener.bind(this));
  }

  hotKeyListener(message: IMessage<string>) {
    console.log(message)
  }

}
