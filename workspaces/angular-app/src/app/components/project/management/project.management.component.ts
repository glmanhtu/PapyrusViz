import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild } from '@angular/core';
import { NgbModal, NgbModalConfig } from '@ng-bootstrap/ng-bootstrap';
import { ProjectCreationComponent } from '../creation/project.creation.component';
import { NgbModalRef } from '@ng-bootstrap/ng-bootstrap/modal/modal-ref';

@Component({
  selector: 'app-project-management',
  templateUrl: './project.management.component.html',
  styleUrls: ['./project.management.component.scss'],
  providers: [NgbModalConfig, NgbModal]
})
export class ProjectManagementComponent implements OnInit, AfterViewInit {
  @ViewChild('content') content : ElementRef;
  @Input() projectCreation: ProjectCreationComponent;
  private modelRef: NgbModalRef | null = null;

  constructor(
    config: NgbModalConfig,
    private modalService: NgbModal,
  ) {
    // customize default values of modals used by this component tree
    config.backdrop = 'static';
    config.keyboard = false;
  }

  ngOnInit(): void {
  }

  ngAfterViewInit(): void {
    this.open();
  }

  open(): void {
    if (this.modelRef !== null) {
      this.modelRef.close();
    }
    this.modelRef = this.modalService.open(this.content, { size: 'lg', centered: true });
  }

  createProject(): void {
    this.modelRef!.close();
    this.projectCreation.open();
  }
}
