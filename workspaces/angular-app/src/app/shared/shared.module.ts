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
import { ThumbnailComponent } from './components/thumbnail/thumbnail.component';
import { FrameComponent } from './components/frame/frame.component';
import { SimilarityCreationComponent } from './components/similarity/creation/similarity.creation.component';
import { ProgressComponent } from './components/progress/progress.component';
import { InfoModalComponent } from './components/info-modal/info-modal.component';
import { ConfirmModalComponent } from './components/confirm-modal/confirm-modal.component';
import { ReactiveFormsModule } from '@angular/forms';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { CommonModule } from '@angular/common';
import { MatchingButtonComponent } from './components/matching-button/matching-button.component';
import { PanZoomDirective } from './directives/pan-zoom.directive';
import { SegmentationComponent } from './components/segmentation/segmentation.component';
import { NoCommaPipe } from './directives/no-comma.directive';
import { ViewLogsComponent } from './components/view-logs/view-logs.component';
import { AboutModalComponent } from './components/about-modal/about-modal.component';
import { ContextMenuDirective } from './directives/context-menu.directive';
import { CheckResultsModelComponent } from './components/check-results-modal/check-results-model.component';
import { ShowSuggestionModelComponent } from './components/show-suggestion-modal/show-suggestion-model.component';

@NgModule({
	declarations: [
		ThumbnailComponent,
		FrameComponent,
		SimilarityCreationComponent,
		ProgressComponent,
		InfoModalComponent,
		ConfirmModalComponent,
		MatchingButtonComponent,
		PanZoomDirective,
		NoCommaPipe,
		SegmentationComponent,
		ViewLogsComponent,
		AboutModalComponent,
		ContextMenuDirective,
		CheckResultsModelComponent,
		ShowSuggestionModelComponent
  ],
	imports: [
		ReactiveFormsModule,
		NgbModule,
		CommonModule,
	],
	exports: [
		ThumbnailComponent,
		FrameComponent,
		SimilarityCreationComponent,
		ProgressComponent,
		InfoModalComponent,
		ConfirmModalComponent,
		MatchingButtonComponent,
		PanZoomDirective,
		NoCommaPipe,
		SegmentationComponent,
		ViewLogsComponent,
		AboutModalComponent,
		ContextMenuDirective,
		CheckResultsModelComponent,
		ShowSuggestionModelComponent
	]
})
export class SharedModule {}
