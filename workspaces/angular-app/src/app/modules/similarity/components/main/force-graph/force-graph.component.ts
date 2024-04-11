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

import { AfterViewInit, Component, ElementRef, Input, OnInit, ViewChild, ViewEncapsulation } from '@angular/core';
import {
  Link, MatchingResponse,
  ProjectDTO, SimilarityRequest,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import * as d3 from 'd3';
import { Simulation, SimulationNodeDatum } from 'd3-force';
import { ForceLink } from 'd3';

interface Node extends SimulationNodeDatum{
  id: number;
}

@Component({
  selector: 'sim-force-graph',
  providers: [NgbNav],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './force-graph.component.html',
  styleUrls: ['./force-graph.component.scss'],
})
export class ForceGraphComponent implements OnInit, AfterViewInit {

  @ViewChild('chartContainer') chartContainer: ElementRef;

  simulation: Simulation<Node, undefined>;

  @Input()
  projectDto: ProjectDTO;
  @Input()
  matching: MatchingResponse;

  threshold = 0.9;

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngAfterViewInit(): void {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();
    this.simulation = d3.forceSimulation<Node>()
      .force("link", d3.forceLink<Node, Link>().id(d => d.id))
      .force("charge", d3.forceManyBody<Node>().strength(-300))
      .force("center", d3.forceCenter<Node>(rect.width / 2, rect.height / 2.5));
    this.updateGraph(this.threshold)
  }


  ngOnInit(): void {
  }

  updateGraph(similarity: number) {
    this.eIpc.send<SimilarityRequest, Link[]>('matching:fetch-similarity', {
      projectPath: this.projectDto.path,
      matchingId: this.matching.id,
      similarity: similarity
    }).then(links => {
      const nodes = Array.from(new Set(links.flatMap(link => [link.source, link.target]))).map(id => ({ id }));

      const svg = d3.select(this.chartContainer.nativeElement)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

      const nodeElements = svg.selectAll<SVGCircleElement, Node>(".node")
        .data(nodes, d => d.id)
        .join("circle")
        .attr("class", "node")
        .attr("r", 10)
        .attr("fill", "steelblue");

      const linkElements = svg.selectAll<SVGLineElement, Link>(".link")
        .data(links)
        .join("line")
        .attr("class", "link");

      this.simulation.nodes(nodes)
        .on("tick", () => {
          nodeElements.attr("cx", (d: Node) => d.x!)
            .attr("cy", (d: Node) => d.y!);
          linkElements.attr("x1", d => (d.source as d3.SimulationNodeDatum).x!)
            .attr("y1", d => (d.source as d3.SimulationNodeDatum).y!)
            .attr("x2", d => (d.target as d3.SimulationNodeDatum).x!)
            .attr("y2", d => (d.target as d3.SimulationNodeDatum).y!);
        });

      this.simulation.force<ForceLink<Node, d3.SimulationLinkDatum<Node>>>("link")!.links(links);
      this.simulation.alpha(1).restart();
    })
    // Remove the existing SVG element if any
  }
}
