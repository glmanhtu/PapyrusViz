import { AfterViewInit, Component, Input, OnInit } from '@angular/core';
import { CategoryDTO, ProjectDTO, Thumbnail, ThumbnailRequest, ThumbnailResponse } from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-images-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './images.panel.component.html',
  styleUrls: ['./images.panel.component.scss'],
})
export class ImagesPanelComponent implements OnInit, AfterViewInit {

  @Input()
  projectDto: ProjectDTO | null = null;

  @Input()
  categories: CategoryDTO[] = [];

  category = new FormControl(1);
  filter = new FormControl('');
  currentPage = 0;
  thumbnails: Thumbnail[] = [];
  isLoading: boolean = false; // is a boolean flag to track whether new items are being loaded.
  isCompleted = false;  // a boolean flag to check whether all items are loaded.

  constructor(
    private eIpc: ElectronIpcService,
  ) {}

  ngOnInit(): void {
  }


  ngAfterViewInit() {
    this.getThumbnails();
  }

  loadData() {
    this.getThumbnails(this.currentPage + 1, false);
  }

  getThumbnails(page = 0, reset = true) {
    if (this.isLoading || (this.isCompleted && !reset)) {
      return;
    }
    this.isLoading = true;
    const thumbnailRequest: ThumbnailRequest = {
      projectPath: this.projectDto!.path,
      categoryId: this.category.value!,
      filter: this.filter.value!,
      page: page,
      perPage: 20
    }
    this.eIpc.send<ThumbnailRequest, ThumbnailResponse>('image:get-thumbnails', thumbnailRequest).then((result) => {
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
