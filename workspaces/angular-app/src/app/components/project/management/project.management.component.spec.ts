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
