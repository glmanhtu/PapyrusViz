import { Component, ElementRef, Inject, Input, OnInit, ViewChild } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { CategoryDTO, ProjectDTO, Thumbnail, ThumbnailRequest, ThumbnailResponse } from 'shared-lib';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { FormControl } from '@angular/forms';
import { SimilarityCreationComponent } from '../similarity/creation/similarity.creation.component';

@Component({
  selector: 'app-panel',
  providers: [NgbNav],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {

  @ViewChild('scrollContainer') scrollContainer!: ElementRef;
  private scrollThreshold = 100; // Adjust this value as needed

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;

  active = 1;
  projectDto: ProjectDTO | null = null;
  categories: CategoryDTO[] = [];
  category = new FormControl(1);
  filter = new FormControl('');
  currentPage = 0;
  thumbnails: Thumbnail[] = [];
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.initProject(projectDto);
    });
  }

  initProject(projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.eIpc.send<string, CategoryDTO[]>('category:get-categories', projectDto.path).then((categories) => {
      this.categories = categories;
    });

    this.getThumbnails();
  }


  createMatching() {
    this.similarityCreationComponent.open();
  }

  onScroll() {
    const element = this.scrollContainer.nativeElement;
    const closeToBottom = element.scrollHeight - element.scrollTop <= element.clientHeight + this.scrollThreshold;
    if (closeToBottom && !this.isLoading && !this.isCompleted) {
      this.getThumbnails(this.currentPage + 1, false);
    }
  }


  getThumbnails(page = 0, reset = true) {
    const thumbnailRequest: ThumbnailRequest = {
      projectPath: this.projectDto!.path,
      categoryId: this.category.value!,
      filter: this.filter.value!,
      page: page,
      perPage: 50
    }
    this.isLoading = true;
    this.eIpc.send<ThumbnailRequest, ThumbnailResponse>('image:get-thumbnails', thumbnailRequest).then((result) => {
      console.log(result);
      if (reset) {
        this.thumbnails.length = 0;
        this.isCompleted = false;
      }
      if (result.thumbnails.length === 0) {
        this.isCompleted = true;
      }
      this.thumbnails.push(...result.thumbnails);
      this.currentPage = page;
      this.isLoading = false;
    });
  }
}
