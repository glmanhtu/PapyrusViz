import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InfoModalComponent } from '../shared/components/info-modal/info-modal.component';
import { ProjectManagementComponent } from '../components/project/management/project.management.component';
import { ProjectCreationComponent } from '../components/project/creation/project.creation.component';

@Injectable({
	providedIn: 'root'
})
export class ModalService {

	constructor(private modalService: NgbModal) { }

	info(message: string) {
		const modalRef = this.modalService.open(InfoModalComponent);
		modalRef.componentInstance.message = message; // Assuming your InfoModalComponent has a 'message' property
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
}