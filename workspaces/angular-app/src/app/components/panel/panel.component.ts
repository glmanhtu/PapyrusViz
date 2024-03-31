import { Component, Inject, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { ProjectDTO } from 'shared-lib';

@Component({
  selector: 'app-panel',
  templateUrl: './panel.component.html',
  styleUrls: ['./panel.component.scss']
})
export class PanelComponent implements OnInit {

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
  ) {}

  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      console.log(projectDto);
    });
  }

}
