import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InfoModalComponent } from '../shared/components/info-modal/info-modal.component';
import { ProjectManagementComponent } from '../modules/home/components/project/management/project.management.component';
import { ProjectCreationComponent } from '../modules/home/components/project/creation/project.creation.component';
import { ProgressComponent } from '../shared/components/progress/progress.component';
import { SimilarityCreationComponent } from '../shared/components/similarity/creation/similarity.creation.component';
import { AppInfo, ProjectDTO } from 'shared-lib';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';
import { SegmentationComponent } from '../shared/components/segmentation/segmentation.component';
import { ViewLogsComponent } from '../shared/components/view-logs/view-logs.component';
import { ElectronIpcService } from './electron-ipc.service';
import { AboutModalComponent } from '../shared/components/about-modal/about-modal.component';

@Injectable({
	providedIn: 'root'
})
export class ModalService {

	constructor(private modalService: NgbModal, private electronIpc: ElectronIpcService) { }

	info(message: string) {
		const modalRef = this.modalService.open(InfoModalComponent);
		modalRef.componentInstance.message = message; // Assuming your InfoModalComponent has a 'message' property
	}

	about() {
		const modalRef = this.modalService.open(AboutModalComponent, {
			size: 'sm', centered: true
		});
		this.electronIpc.send<void, AppInfo>('app:info', undefined).then((result) => {
			modalRef.componentInstance.appInfo = result;
		});
	}

	warning(title: string, headline: string, description: string) {
		const modalRef = this.modalService.open(ConfirmModalComponent);
		modalRef.componentInstance.title = title;
		modalRef.componentInstance.headline = headline;
		modalRef.componentInstance.description = description;
		modalRef.componentInstance.modalRef = modalRef;
		return modalRef.result;
	}

	projectManagement() {
		const modalRef = this.modalService.open(ProjectManagementComponent, {
			size: 'lg', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.modalRef = modalRef;
	}

	projectCreation() {
		const modalRef = this.modalService.open(ProjectCreationComponent, {
			size: 'lg', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.modalRef = modalRef;
		return modalRef;
	}

	projectReconfiguration(projectPath: string) {
		const modalCreation = this.projectCreation();
		modalCreation.componentInstance.message = 'It seems that some directories are mis-configured, please check again!';
		modalCreation.componentInstance.title = 'Project Configuration';
		modalCreation.componentInstance.isUpdate = true;
		this.electronIpc.send<string, ProjectDTO>('project:project-info', projectPath).then((result) => {
			modalCreation.componentInstance.projectForm.get('name').setValue(result.name);
			modalCreation.componentInstance.projectForm.get('path').setValue(result.path);
			modalCreation.componentInstance.projectForm.get('dataPath').setValue(result.dataPath);
		});
	}

	similarityCreation(projectDto: ProjectDTO) {
		const modalRef = this.modalService.open(SimilarityCreationComponent, {
			size: 'lg', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.projectDto = projectDto;
		modalRef.componentInstance.modalRef = modalRef;
		return modalRef;
	}

	imageSegmentation(projectDto: ProjectDTO, imageId: number) {
		const modalRef = this.modalService.open(SegmentationComponent, {
			size: 'xl', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.loadImage(imageId, projectDto);
		modalRef.componentInstance.modalRef = modalRef;
		return modalRef;
	}

	progress(title: string) {
		const modalRef = this.modalService.open(ProgressComponent, {
			size: 'lg', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.title = title;
		modalRef.componentInstance.showProgress = true;
		modalRef.componentInstance.onComplete.subscribe(() => {
			modalRef.close();
		})
		return modalRef.componentInstance;
	}

	viewLogs() {
		const modalRef = this.modalService.open(ViewLogsComponent, {
			size: 'xl', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.modalRef = modalRef;
		return modalRef;
	}
}