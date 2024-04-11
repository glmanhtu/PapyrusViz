import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InfoModalComponent } from '../shared/components/info-modal/info-modal.component';
import { ProjectManagementComponent } from '../modules/home/components/project/management/project.management.component';
import { ProjectCreationComponent } from '../modules/home/components/project/creation/project.creation.component';
import { ProgressComponent } from '../shared/components/progress/progress.component';
import { SimilarityCreationComponent } from '../shared/components/similarity/creation/similarity.creation.component';
import { ProjectDTO } from 'shared-lib';
import { ConfirmModalComponent } from '../shared/components/confirm-modal/confirm-modal.component';

@Injectable({
	providedIn: 'root'
})
export class ModalService {

	constructor(private modalService: NgbModal) { }

	info(message: string) {
		const modalRef = this.modalService.open(InfoModalComponent);
		modalRef.componentInstance.message = message; // Assuming your InfoModalComponent has a 'message' property
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
	}


	similarityCreation(projectDto: ProjectDTO) {
		const modalRef = this.modalService.open(SimilarityCreationComponent, {
			size: 'lg', centered: true, backdrop: 'static', keyboard: false
		});
		modalRef.componentInstance.projectDto = projectDto;
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
}