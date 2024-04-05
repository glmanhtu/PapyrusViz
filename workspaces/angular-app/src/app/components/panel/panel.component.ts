import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { CategoryDTO, ProjectDTO } from 'shared-lib';
import { NgbDropdown, NgbNav, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../similarity/creation/similarity.creation.component';
import { ImagesPanelComponent } from './images/images.panel.component';
import { MatchingPanelComponent } from './matching/matching.panel.component';

@Component({
  selector: 'app-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  private scrollThreshold = 100; // Adjust this value as needed

  @ViewChild('thumbnails') thumbnailsPanel: ImagesPanelComponent;

  @ViewChild('matching') matchingPanel: MatchingPanelComponent;

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;
  scrollTop = new Map<number, number>;

  active = 1;
  projectDto: ProjectDTO;
  categories: CategoryDTO[] = [];

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.projectDto = projectDto;
      this.eIpc.send<string, CategoryDTO[]>('category:get-categories', projectDto.path).then((categories) => {
        this.categories = categories;
      });
    });
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    const element = this.scrollContainer.nativeElement;
    this.scrollTop.set(changeEvent.activeId, element.scrollTop);
  }

  onNavShown() {
    const element = this.scrollContainer.nativeElement;
    element.scrollTop = this.scrollTop.get(this.active) || 0;
  }

  onScroll() {
    const element = this.scrollContainer.nativeElement;
    const closeToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + this.scrollThreshold;
    if (closeToBottom) {
      if (this.active === 1) {
        this.thumbnailsPanel.loadData();
      } else if (this.active === 2) {
        this.matchingPanel.loadData();
      }
    }
  }
}
