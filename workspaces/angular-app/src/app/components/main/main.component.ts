import { Component, Inject, Input, OnInit } from '@angular/core';
import { BroadcastService, PROJECT_BROADCAST_SERVICE_TOKEN } from '../../services/broadcast.service';
import { AssemblingDTO, GetAssemblingRequest, ImgDto, ProjectDTO } from 'shared-lib';
import { ElectronIpcService } from '../../services/electron-ipc.service';
import { NgbNav, NgbNavChangeEvent } from '@ng-bootstrap/ng-bootstrap';
import { PanelComponent } from '../panel/panel.component';

@Component({
  selector: 'app-main',
  providers: [NgbNav],
  templateUrl: './main.component.html',
  styleUrls: ['./main.component.scss'],
})
export class MainComponent implements OnInit {

  projectDto: ProjectDTO | null = null;
  assemblings: AssemblingDTO[] = [];
  active: number;

  @Input()
  panel: PanelComponent;

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
    });

    this.eIpc.send<string, number>('assembling:get-activated-assembling-id', projectDto.path).then((assemblingId) => {
      this.active = assemblingId;
    })
  }

  onNavChange(changeEvent: NgbNavChangeEvent) {
    this.eIpc.send<GetAssemblingRequest, void>('assembling:set-activated-assembling-id', {
      projectPath: this.projectDto!.path,
      assemblingId: changeEvent.nextId
    })
  }

  close(event: MouseEvent, _: number) {
    event.preventDefault();
    event.stopImmediatePropagation();
  }

  add(event: MouseEvent) {
    event.preventDefault();
    this.eIpc.send<string, AssemblingDTO>('assembling:create-assembling', this.projectDto!.path).then((assemblingDto) => {
      this.assemblings.push(assemblingDto);
      this.active = assemblingDto.id;
    });
  }

  findMatching(img: ImgDto) {
    this.panel.findMatching(img);
  }
}
