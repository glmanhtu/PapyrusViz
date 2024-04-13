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
import { FormControl } from '@angular/forms';

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
export class ForceGraphComponent implements OnInit, AfterViewInit {

  @ViewChild('chartContainer') chartContainer: ElementRef;

  simulation: Simulation<Node, undefined>;

  @Input()
  projectDto: ProjectDTO;
  @Input()
  matching: MatchingResponse;

  @Input()
  threshold: FormControl;

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngAfterViewInit(): void {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();

    this.simulation = d3.forceSimulation<Node>()
      .force("link", d3.forceLink<Node, Link>().id(d => d.id)
        .strength(d => 2 / d.similarity)) // Adjust strength based on similarity
      .force("charge", d3.forceManyBody<Node>().strength(-400))
      .force("center", d3.forceCenter<Node>(rect.width / 2, rect.height / 2))
      .force('x', d3.forceX(rect.width / 2).strength(0.4))
      .force('y', d3.forceY(rect.height / 2).strength(0.5))

    this.updateGraph(this.threshold.value / 100)
    this.threshold.valueChanges.subscribe((val) => {
      console.log('Update ' + val )
      this.updateGraph(val / 100);
    })
  }


  ngOnInit(): void {
  }


  updateGraph(similarity: number) {
    // this.simulation.stop();

    d3.select(this.chartContainer.nativeElement).select('svg').remove();
    // const color = d3.scaleOrdinal(d3.schemeCategory10);
    this.eIpc.send<SimilarityRequest, Link[]>('matching:fetch-similarity', {
      projectPath: this.projectDto.path,
      matchingId: this.matching.id,
      similarity: similarity
    }).then(links => {
      const nodes = Array.from(new Set(links.flatMap(link => [link.source, link.target]))).map(id => ({ id: id.toString() }));

      const svg = d3.select(this.chartContainer.nativeElement)
        .append('svg')
        .attr('width', '100%')
        .attr('height', '100%');

      const link = svg.append("g")
        .attr("class", "links")
        .selectAll("line")
        .data(links)
        .enter().append<SVGLineElement>("line")
        // .attr("stroke-width", d => Math.sqrt(d.value));

      const node = svg.append("g")
        .attr("class", "nodes")
        .selectAll("circle")
        .data(nodes)
        .enter().append<SVGCircleElement>("circle")
        .attr("r", 5)
        // .attr("fill", d => color(d.group));
        .call(d3.drag<SVGCircleElement, Node>()
          .on("start", this.dragstarted(this.simulation))
          .on("drag", this.dragged)
          .on("end", this.dragended(this.simulation)));

      node.append("title")
        .text(d => d.id);

      this.simulation
        .nodes(nodes)
        .on("tick", () => {
          link
            /* eslint-disable */
            .attr("x1", d => (d.source as any).x)
            .attr("y1", d => (d.source as any).y)
            .attr("x2", d => (d.target as any).x)
            .attr("y2", d => (d.target as any).y);
          node
            .attr("cx", d => (d as any).x)
            .attr("cy", d => (d as any).y);
          /* eslint-enable */
        });

      this.simulation.force<ForceLink<Node, d3.SimulationLinkDatum<Node>>>("link")!.links(links);
    })
    // Remove the existing SVG element if any
  }


  private dragstarted(simulation: d3.Simulation<Node, undefined>) {
    // eslint-disable-next-line
    return (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0.3).restart();
      d.fx = d.x;
      d.fy = d.y;
    };
  }

  // eslint-disable-next-line
  private dragged(event: any, d: any) {
    d.fx = event.x;
    d.fy = event.y;
  }

  private dragended(simulation: d3.Simulation<Node, undefined>) {
    // eslint-disable-next-line
    return (event: any, d: any) => {
      if (!event.active) simulation.alphaTarget(0);
      d.fx = null;
      d.fy = null;
    };
  }



}
