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

import { NgModule, NgZone } from '@angular/core';
import { NavComponent } from './components/nav/nav.component';
import { PanelComponent } from './components/main/panel/panel.component';
import { MainComponent } from './components/main/main.component';
import { ProjectManagementComponent } from './components/project/management/project.management.component';
import { ProjectCreationComponent } from './components/project/creation/project.creation.component';
import { BoardMainComponent } from './components/main/board/board.main.component';
import { MatchingPanelComponent } from './components/main/panel/matching/matching.panel.component';
import { ImagesPanelComponent } from './components/main/panel/images/images.panel.component';
import { NavMainComponent } from './components/main/nav/nav.main.component';
import { HomeComponent } from './home.component';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { ProjectDTO } from 'shared-lib';
import { SharedModule } from '../../shared/shared.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';

@NgModule({
	declarations: [
    NavComponent,
    PanelComponent,
    MainComponent,
		ProjectManagementComponent,
		ProjectCreationComponent,
		BoardMainComponent,
		MatchingPanelComponent,
		ImagesPanelComponent,
		NavMainComponent,
		HomeComponent,
  ],
	imports: [
		ReactiveFormsModule,
		SharedModule,
		CommonModule,
		NgbModule,
	],
	providers: [
		{
			provide: PROJECT_BROADCAST_SERVICE_TOKEN,
			useFactory: (ngZone: NgZone) => new BroadcastService<ProjectDTO>(ngZone),
			deps: [NgZone]
		}
	],
	exports: [
		HomeComponent
	]
})
export class HomeModule {}
