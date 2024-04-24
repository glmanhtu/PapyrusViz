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
  ProjectDTO, RecordImgMatchingResponse, RecordMatchingRequest,
} from 'shared-lib';
import { ElectronIpcService } from '../../../../../services/electron-ipc.service';
import { NgbNav } from '@ng-bootstrap/ng-bootstrap';
import { FormControl, FormGroup } from '@angular/forms';
import * as d3 from 'd3'


interface InfoPanelData {
  name: string;
  bulletins: Set<string>;
  imageSrc: string;
  width: number;
  height: number;
}

function extractLeadingNumbers(inputString: string): number | null {
  // Regular expression to match leading numbers
  const leadingNumbersRegex = /^(\d+)/;

  // Executing the regex on the input string
  const match = inputString.match(leadingNumbersRegex);

  // If there's a match, return the parsed number, otherwise return null
  if (match && match[1]) {
    return parseInt(match[1], 10);
  } else {
    return null;
  }
}

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
        item.group = extractLeadingNumbers(item.name) || 0
      })

      this.updateGraph()
    })

    this.forceControl.valueChanges.subscribe((_) => {
      this.updateGraph();
      // console.log(this.graphObject.d3Force('charge')!.strength())
      // this.graphObject.d3ReheatSimulation()
    });
  }


  ngOnInit(): void {
  }

  updateGraph() {
    const rect = this.chartContainer.nativeElement.getBoundingClientRect();
    const tooltip = d3.select("#tooltip");
    const tooltipName = d3.select("#tooltip-name");
    const tooltipImage = d3.select("#tooltip-image");
    const tooltipAttribute = d3.select("#tooltip-attribute");

    d3.select(this.chartContainer.nativeElement).select('svg').remove();
    const color = d3.scaleSequential(d3.interpolateRainbow)

    const imgMap = new Map<string, InfoPanelData>();

    const drawTooltip = (event: MouseEvent, d: MdsResult) => {
      const info = imgMap.get(d.name)!;
      tooltipName.text(info.name);
      tooltipImage.attr('src', info.imageSrc);
      tooltipAttribute.text('');
      for (const bulletin of info.bulletins) {
        tooltipAttribute.append('li').text(bulletin);
      }

      tooltip.style('display', 'flex');
      tooltip.style('top', `${event.clientY - rect.top + 30}px`);
      tooltip.style('left', `${event.clientX - rect.left + 20}px`);
    }

    const tooltipMouseover = (event: MouseEvent, d: MdsResult) => {
      if (!imgMap.has(d.name)) {
        this.eIpc.send<RecordMatchingRequest, RecordImgMatchingResponse[]>('matching:get-record-imgs', {
          projectPath: this.projectDto.path,
          recordId: parseInt(d.id as string),
          matchingId: this.matching.id
        }).then(items => {
          const im = items[0];
          const ratio = im.img.width > im.img.height
            ? 200 / im.img.width
            : 200 / im.img.height
          const item: InfoPanelData = {
            name: im.name,
            imageSrc: im.img.path,
            bulletins: new Set<string>(items.map(x => x.category.name)),
            width: Math.round(im.img.width * ratio),
            height: Math.round(im.img.height * ratio)
          }
          imgMap.set(d.name, item);
          drawTooltip(event, d)
        });
      } else {
        drawTooltip(event, d)
      }
    }

    const padding =  32,
      w = rect.width,
      h = rect.height,
      xDomain = [this.domains.minX, this.domains.maxX],
      yDomain = [this.domains.minY, this.domains.maxY],
      pointRadius = 3;

    const xScale = d3.scaleLinear(xDomain, [padding, w - padding])
    const yScale = d3.scaleLinear(yDomain, [padding, h - padding])
    // const xAxis = d3.axisBottom(xScale)
    //     // .ticks( 7);
    //
    // const yAxis = d3.axisLeft(yScale)
    //     // .ticks( 7);

    const zoom = d3.zoom()
      .scaleExtent([1, 10]) // This controls how much you can zoom in and out
      .translateExtent([[-100, -100], [w + 100, h + 100]]) // This controls how much you can pan
      .on('zoom', zoomed); // This is the zoom event listener

    const svg = d3.select(this.chartContainer.nativeElement).append("svg")
      .attr("width", w)
      .attr("height", h)
      // eslint-disable-next-line @typescript-eslint/no-explicit-any
      .call(zoom as any);

    // Create a container within the SVG to hold your graph, and apply transformations to this container
    const container = svg.append('g');

    // container.append("g")
    //   .attr("class", "axis")
    //   .attr("transform", "translate(0," + (h - padding + 2*pointRadius) + ")")
    //   .call(xAxis);
    //
    // container.append("g")
    //   .attr("class", "axis")
    //   .attr("transform", "translate(" + (padding - 2*pointRadius) + ",0)")
    //   .call(yAxis);

    const nodes = container.selectAll("circle")
      .data(this.data)
      .enter()
      .append("g");

    const fillColour = (d: MdsResult) => {
      if (this.forceControl.getRawValue()['autoColor'] === '1') {
        return color(d.group! / 100);
      } else {
        return '#000';
      }
    }

    if (this.forceControl.getRawValue()['textMode'] === '1') {
      nodes.append("text")
        .attr("text-anchor", "middle")
        .attr("fill", fillColour) // Set fill color based on group
        .text((d) => d.name)
        .attr('class', 'mds-text mds-element')
        .attr('font-size', '0.8em')
        .attr("x", function(d) { return xScale(d.position.x); })
        .attr("y", function(d) { return yScale(d.position.y); })
        .on('mouseover', tooltipMouseover)
        .on('mouseout', () => {
          tooltip.style('display', 'none');
        });
    } else {
      nodes.append("circle")
        .attr("r", pointRadius)
        // .attr("fill", 'rgba(31, 120, 180, 0.92)')
        .attr("fill", fillColour) // Set fill color based on group
        .attr('class', 'mds-element')
        .attr("cx", function(d) { return xScale(d.position.x); })
        .attr("cy", function(d) { return yScale(d.position.y); })
        .on('mouseover', tooltipMouseover)
        .on('mouseout', () => {
          tooltip.style('display', 'none');
        });

    }

    // Step 3: Create a function that will be called on each zoom event
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    function zoomed(event: any) {
      // Get the current zoom state
      let transform = event.transform;

      if (transform.k === 1) {
        transform = d3.zoomIdentity;
      }

      // Apply the new transform to your graph container
      container.attr('transform', transform);

      // Adjust the font size of the text nodes based on the current zoom scale
      nodes.select('text')
        .style('font-size', `${.8 / transform.k}em`);
    }

  }
}
