import { Component, Inject, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { AssemblingDTO, ProjectDTO } from 'shared-lib';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';

@Component({
  selector: 'app-main',
  providers: [NgbNav],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

  projectDto: ProjectDTO | null = null;
  assemblings: AssemblingDTO[] = [];
  active: AssemblingDTO;

  constructor(
    @Inject(PROJECT_BROADCAST_SERVICE_TOKEN) private projectBroadcastService: BroadcastService<ProjectDTO>,
    private eIpc: ElectronIpcService) {
  }
  ngOnInit(): void {
    this.projectBroadcastService.observe().subscribe((projectDto) => {
      this.initProject(projectDto);
    });
  }

  initProject(projectDto: ProjectDTO) {
    this.projectDto = projectDto;
    this.eIpc.send<string, AssemblingDTO[]>('assembling:get-assemblings', projectDto.path).then((assemblings) => {
      this.assemblings = assemblings;
      console.log(assemblings)
      for (let i = 0; i < assemblings.length; i++) {
        if (assemblings[i].isActivated) {
          this.active = assemblings[i];
          break;
        }
      }
    });
  }


  close(event: MouseEvent, _: number) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  add(event: MouseEvent) {
    event.preventDefault();
  }
}
