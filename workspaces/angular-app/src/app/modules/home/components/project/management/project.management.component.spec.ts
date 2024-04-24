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

import { ComponentFixture, TestBed, waitForAsync } from '@angular/core/testing';

import { ElectronIpcService } from 'src/app/services/electron-ipc.service';
import {
	TranslateFakeLoader,
	TranslateLoader,
	TranslateModule,
	TranslateService,
} from '@ngx-translate/core';
import { ReactiveFormsModule } from '@angular/forms';
import { ProjectManagementComponent } from './project.management.component';

describe('MultiplesComponent', () => {
	const mockElectronIpcService = jasmine.createSpyObj(['receive', 'send']);
	let fixture: ComponentFixture<ProjectManagementComponent>;
	let component: ProjectManagementComponent;

	beforeEach(waitForAsync(() => {
		TestBed.configureTestingModule({
			declarations: [ProjectManagementComponent],
			imports: [
				ReactiveFormsModule,
				TranslateModule,
				TranslateModule.forRoot({
					loader: {
						provide: TranslateLoader,
						useClass: TranslateFakeLoader,
					},
				}),
			],
			providers: [
				TranslateService,
				{
					provide: ElectronIpcService,
					useValue: mockElectronIpcService,
				},
			],
		}).compileComponents();
	}));

	beforeEach(() => {
		fixture = TestBed.createComponent(ProjectManagementComponent);
		component = fixture.componentInstance;
		fixture.detectChanges();
	});

	it('should create', () => {
		expect(component).toBeTruthy();
	});
});
