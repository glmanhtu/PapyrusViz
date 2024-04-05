import { Component, Inject, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { ProjectDTO } from 'shared-lib';

@Component({
  selector: 'app-nav',
  templateUrl: './nav.component.html',
  styleUrls: ['./nav.component.scss']
})
export class NavComponent implements OnInit {

  projectDto: ProjectDTO;

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
  ) {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.projectDto = projectDto;
    });
  }

  ngOnInit(): void {
    console.log('NavComponent INIT');
   }

}
