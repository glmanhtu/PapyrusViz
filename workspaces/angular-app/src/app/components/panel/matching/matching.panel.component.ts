import { Component, Input, OnInit } from '@angular/core';
import { CategoryDTO, MatchingResponse, ProjectDTO } from 'shared-lib';
import { NgbDropdown, NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { ElectronIpcService } from '../../../services/electron-ipc.service';
import { SimilarityCreationComponent } from '../../similarity/creation/similarity.creation.component';

@Component({
  selector: 'app-matching-panel',
  providers: [NgbNav, NgbDropdown],
  templateUrl: './matching.panel.component.html',
  styleUrls: ['./matching.panel.component.scss'],
})
export class MatchingPanelComponent implements OnInit {

  @Input()
  projectDto: ProjectDTO;

  @Input()
  similarityCreationComponent: SimilarityCreationComponent;

  @Input()
  categories: CategoryDTO[] = [];

  matchings: MatchingResponse[] = [];

  constructor(
    private _: ElectronIpcService,
  ) {}

  ngOnInit(): void {
  }

  createMatching() {
    this.similarityCreationComponent.open();
  }

  loadData() {

  }
}
