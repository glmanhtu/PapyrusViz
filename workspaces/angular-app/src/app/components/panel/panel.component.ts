import { Component, Inject, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { CategoryDTO, ProjectDTO } from 'shared-lib';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { Thumbnail, ThumbnailRequest, ThumbnailResponse } from 'shared-lib/.dist/models/img';
import { FormControl } from '@angular/forms';

@Component({
  selector: 'app-panel',
  providers: [NgbNav],
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss'],
})
export class PanelComponent implements OnInit {

  active = 1;
  projectDto: ProjectDTO | null = null;
  categories: CategoryDTO[] = [];
  category = new FormControl(1);
  filter = new FormControl('');
  currentPage = 0;
  thumbnails: Thumbnail[] = [];

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

  getThumbnails() {
    const thumbnailRequest: ThumbnailRequest = {
      projectPath: this.projectDto!.path,
      categoryId: this.category.value!,
      filter: this.filter.value!,
      page: this.currentPage,
      perPage: 50
    }

    this.eIpc.send<ThumbnailRequest, ThumbnailResponse>('image:get-thumbnails', thumbnailRequest).then((result) => {
      console.log(result);
      this.thumbnails.push(...result.thumbnails);
    });
  }
}
