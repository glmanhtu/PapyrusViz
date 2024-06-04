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

import { AfterViewInit, Component, Inject } from '@angular/core';
import { ProjectDTO } from 'shared-lib';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { ElectronIpcService } from '../../services/electron-ipc.service';

@Component({
  selector: 'app-home',
  host: {
    class: 'vh-100 vw-100 d-flex flex-column overflow-hidden'
  },
  templateUrl: './home.component.html',
  styleUrls: ['./home.component.scss'],
})
export class HomeComponent implements AfterViewInit {

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private electronIpc: ElectronIpcService) { }

  ngAfterViewInit(): void {
    this.electronIpc.send<string, ProjectDTO>('project:load-project', '/home/mvu/Downloads/IRCLView/project').then((project) => {
      this.projectBroadcastService.publish(project);
    })
  }

  ngOnInit(): void {

  }
}
