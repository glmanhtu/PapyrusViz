import { Injectable } from '@angular/core';
import { NgbModal } from '@ng-bootstrap/ng-bootstrap';
import { InfoModalComponent } from '../shared/components/info-modal/info-modal.component';

@Injectable({
	providedIn: 'root'
})
export class ModalService {

	constructor(private modalService: NgbModal) { }

	info(message: string) {
		const modalRef = this.modalService.open(InfoModalComponent);
		modalRef.componentInstance.message = message; // Assuming your InfoModalComponent has a 'message' property
	}
}