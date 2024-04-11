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

import { NgModule } from '@angular/core';
import { SharedModule } from '../../shared/shared.module';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { ReactiveFormsModule } from '@angular/forms';
import { SimilarityComponent } from './similarity.component';
import { NavComponent } from './components/nav/nav.component';
import { PanelComponent } from './components/panel/panel.component';
import { MainComponent } from './components/main/main.component';

@NgModule({
	declarations: [
		NavComponent,
		SimilarityComponent,
		PanelComponent,
		MainComponent
  ],
	imports: [
		ReactiveFormsModule,
		SharedModule,
		CommonModule,
		NgbModule,
	],
	exports: [
		SimilarityComponent
	]
})
export class SimilarityModule {}
