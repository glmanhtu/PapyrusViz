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
  MatchingRequest, MatchingResponse, MdsResult,
  ProjectDTO
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import * as d3 from 'd3'


@Component({
  selector: 'sim-mds-graph',
  providers: [NgbNav],
  encapsulation: ViewEncapsulation.None,
  templateUrl: './mds-graph.component.html',
  styleUrls: ['./mds-graph.component.scss'],
})
export class MdsGraphComponent implements OnInit, AfterViewInit, OnDestroy {

  @ViewChild('chartContainer') chartContainer: ElementRef;

  @Input()
  projectDto: ProjectDTO;
  @Input()
  matching: MatchingResponse;

  @Input()
  threshold: FormControl;

  @Input()
  forceControl: FormGroup;

  data: MdsResult[] = [];
  domains = {
    minX: 9999,
    maxX: -9999,
    minY: 9999,
    maxY: -9999
  }

  constructor(
    private eIpc: ElectronIpcService) {
  }

  ngOnDestroy(): void {
  }

  ngAfterViewInit(): void {
    this.eIpc.send<MatchingRequest, MdsResult[]>('matching:get-mds', {
      projectPath: this.projectDto.path,
      matchingId: this.matching.id
    }).then(results => {
      console.log(results)
      this.data = results;
      this.data.forEach(item => {
        if (item.position.x > this.domains.maxX) {
          this.domains.maxX = item.position.x
        }
        if (item.position.x < this.domains.minX) {
          this.domains.minX = item.position.x
        }
        if (item.position.y > this.domains.maxY) {
          this.domains.maxY = item.position.y
        }
        if (item.position.y < this.domains.minY) {
          this.domains.minY = item.position.y
        }
      })

      this.updateGraph(this.threshold.value)
    })

    this.forceControl.valueChanges.subscribe((values) => {
      console.log(values)
      this.updateGraph(this.threshold.value);
      // console.log(this.graphObject.d3Force('charge')!.strength())
      // this.graphObject.d3ReheatSimulation()
    });
    this.threshold.valueChanges.subscribe(async (val) => {
      if (val > 0.5) {
        console.log('Update ' + val )
        await this.updateGraph(val);
      }
    })
  }


  ngOnInit(): void {
  }

  async updateGraph(similarity: number) {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();

    const padding =  32,
      w = rect.width,
      h = rect.height,
      xDomain = [this.domains.minX, this.domains.maxX],
      yDomain = [this.domains.minY, this.domains.maxY],
      pointRadius = 3;

    const xScale = d3.scaleLinear(xDomain, [padding, w - padding])
    const yScale = d3.scaleLinear(yDomain, [padding, h - padding])
    const xAxis = d3.axisBottom(xScale)
        // .ticks( 7);

    const yAxis = d3.axisLeft(yScale)
        // .ticks( 7);

    const svg = d3.select(this.chartContainer.nativeElement).append("svg")
      .attr("width", w)
      .attr("height", h);

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(0," + (h - padding + 2*pointRadius) + ")")
      .call(xAxis);

    svg.append("g")
      .attr("class", "axis")
      .attr("transform", "translate(" + (padding - 2*pointRadius) + ",0)")
      .call(yAxis);

    const nodes = svg.selectAll("circle")
      .data(this.data)
      .enter()
      .append("g");

    nodes.append("circle")
      .attr("r", pointRadius)
      .attr("cx", function(d) { return xScale(d.position.x); })
      .attr("cy", function(d) { return yScale(d.position.y); });

    // nodes.append("text")
    //   .attr("text-anchor", "middle")
    //   .text((d) => d.name)
    //   .attr("x", function(d) { return xScale(d.position.x); })
    //   .attr("y", function(d) { return yScale(d.position.y) - 2 *pointRadius; });
  }
}
