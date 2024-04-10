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

import { HttpClient, HttpClientModule } from '@angular/common/http';
import { NgModule, NgZone } from '@angular/core';
import { ReactiveFormsModule } from '@angular/forms';
import { BrowserModule } from '@angular/platform-browser';
import { TranslateLoader, TranslateModule } from '@ngx-translate/core';
import { TranslateHttpLoader } from '@ngx-translate/http-loader';
import { AppComponent } from './app.component';
import { NavComponent } from './components/nav/nav.component';
import { PanelComponent } from './components/panel/panel.component';
import { MainComponent } from './components/main/main.component';
import { NgbModule } from '@ng-bootstrap/ng-bootstrap';
import { ProjectManagementComponent } from './components/project/management/project.management.component';
import { ProjectCreationComponent } from './components/project/creation/project.creation.component';
import {
	BroadcastService,
	PROJECT_BROADCAST_SERVICE_TOKEN,
} from './services/broadcast.service';
import { ProjectDTO } from 'shared-lib';
import { ThumbnailComponent } from './shared/components/thumbnail/thumbnail.component';
import { BoardMainComponent } from './components/main/board/board.main.component';
import { FrameComponent } from './shared/components/frame/frame.component';
import { SimilarityCreationComponent } from './components/similarity/creation/similarity.creation.component';
import { MatchingPanelComponent } from './components/panel/matching/matching.panel.component';
import { ImagesPanelComponent } from './components/panel/images/images.panel.component';
import { ProgressComponent } from './shared/components/progress/progress.component';
import { InfoModalComponent } from './shared/components/info-modal/info-modal.component';
import { NavMainComponent } from './components/main/nav/nav.main.component';


// AoT requires an exported function for factories
export function HttpLoaderFactory(http: HttpClient): TranslateHttpLoader {
	return new TranslateHttpLoader(http, './assets/i18n/', '.json');
}

@NgModule({
	declarations: [
    AppComponent, 
    NavComponent,
    PanelComponent,
    MainComponent,
		ProjectManagementComponent,
		ProjectCreationComponent,
		ThumbnailComponent,
		BoardMainComponent,
		FrameComponent,
		SimilarityCreationComponent,
		MatchingPanelComponent,
		ImagesPanelComponent,
		ProgressComponent,
		InfoModalComponent,
		NavMainComponent
  ],
	imports: [
		BrowserModule,
		NgbModule,
		HttpClientModule,
		ReactiveFormsModule,
		TranslateModule.forRoot({
			defaultLanguage: 'en',
			loader: {
				provide: TranslateLoader,
				useFactory: HttpLoaderFactory,
				deps: [HttpClient],
			},
		}),
	],
	providers: [
		{
			provide: PROJECT_BROADCAST_SERVICE_TOKEN,
			useFactory: (ngZone: NgZone) => new BroadcastService<ProjectDTO>(ngZone),
			deps: [NgZone]
		}
	],
	bootstrap: [AppComponent],
})
export class AppModule {}
