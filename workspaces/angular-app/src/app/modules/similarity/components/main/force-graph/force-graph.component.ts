/*
 * Copyright (C) 2024  Manh Tu VU
 *
 * This program is free software: you can redistribute it and/or modify
 * it under the terms of the GNU General Public License as published by
 * the Free Software Foundation, either version 3 of the License, or
 * (at your option) any later version.
 *
 * This program is distributed in the hope that it will be useful,
 * but WITHOUT ANY WARRANTY; without even the implied warranty of
 * MERCHANTABILITY or FITNESS FOR A PARTICULAR PURPOSE.  See the
 * GNU General Public License for more details.
 *
 * You should have received a copy of the GNU General Public License
 * along with this program.  If not, see <https://www.gnu.org/licenses/>.
 */

import {
  AfterViewInit,
  Component,
  ElementRef,
  Input,
  OnDestroy,
  OnInit,
  ViewChild,
  ViewEncapsulation,
} from '@angular/core';
import {
  Link, MatchingResponse,
  ProjectDTO, SimilarityRequest,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { Simulation, SimulationNodeDatum } from 'd3-force';
import * as d3d from 'd3-force-3d';
import { FormControl, FormGroup } from '@angular/forms';
import ForceGraph, { ForceGraphInstance } from 'force-graph';

interface Node extends SimulationNodeDatum {
  id: string;
}

@Component({
  selector: 'sim-force-graph',
  providers: [NgbNav],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './force-graph.component.html',
  styleUrls: ['./force-graph.component.scss'],
})
export class ForceGraphComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer') chartContainer: ElementRef;

  simulation: Simulation<Node, undefined>;

  @Input()
  projectDto: ProjectDTO;
  @Input()
  matching: MatchingResponse;

  @Input()
  threshold: FormControl;

  graphObject: ForceGraphInstance;

  @Input()
  forceControl: FormGroup;

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngOnDestroy(): void {
    this.graphObject.pauseAnimation();
    this.graphObject.graphData({ nodes: [], links: []});
  }

  ngAfterViewInit(): void {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();
    this.graphObject = ForceGraph()(this.chartContainer.nativeElement);
    this.graphObject.d3Force('x', d3d.forceX(rect.width / 2).strength(0.1))
    this.graphObject.d3Force('y', d3d.forceY(rect.height / 2).strength(0.1))

    this.updateGraph(this.threshold.value)
    this.forceControl.valueChanges.subscribe((values) => {
      console.log(values)
      this.updateGraph(this.threshold.value);
      // console.log(this.graphObject.d3Force('charge')!.strength())
      // this.graphObject.d3ReheatSimulation()
    });
    this.threshold.valueChanges.subscribe((val) => {
      if (val > 0.5) {
        console.log('Update ' + val )
        this.updateGraph(val);
      }
    })
  }


  ngOnInit(): void {
  }

  updateGraph(similarity: number) {
    // this.simulation.stop();

    // const color = d3.scaleOrdinal(d3.schemeCategory10);
    this.eIpc.send<SimilarityRequest, Link[]>('matching:fetch-similarity', {
      projectPath: this.projectDto.path,
      matchingId: this.matching.id,
      similarity: similarity
    }).then(links => {
      this.graphObject.pauseAnimation();
      const nodes = Array.from(new Set(links.flatMap(link => [link.source, link.target]))).map(id => ({ id: id.toString() }));
      this.graphObject
        .d3Force('link')!.strength((d: Link) => 1 - (d.similarity - similarity) / (1 - similarity));
      this.graphObject
        .d3Force('charge')!.strength(this.forceControl.getRawValue()['charge'])
      this.graphObject
        .graphData({nodes: nodes, links: links})
        // .nodeAutoColorBy('id')
        .nodeLabel(node => `${(node as Node).id}`)
      this.graphObject.resumeAnimation();
    })
  }
}
